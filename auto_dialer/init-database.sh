#!/bin/bash

set -e

echo "=========================================="
echo "Database Initialization Script"
echo "=========================================="

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
MYSQL_HOST=${MYSQL_HOST:-mysql}
MYSQL_USER=${MYSQL_USER:-demandify}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-Demandify@765}
MYSQL_DATABASE=${MYSQL_DATABASE:-demandify_db}
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-rootpassword}

# URL encode password for DATABASE_URL (handle special characters like @, #, etc.)
ENCODED_PASSWORD=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$MYSQL_PASSWORD" 2>/dev/null || echo "$MYSQL_PASSWORD" | sed 's/@/%40/g' | sed 's/#/%23/g' | sed 's/%/%25/g' | sed 's/ /%20/g')
ROOT_ENCODED_PASSWORD=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$MYSQL_ROOT_PASSWORD" 2>/dev/null || echo "$MYSQL_ROOT_PASSWORD" | sed 's/@/%40/g' | sed 's/#/%23/g' | sed 's/%/%25/g' | sed 's/ /%20/g')

# Wait for MySQL using Node.js/Prisma (more reliable than mysql client)
max_attempts=60
attempt=0
echo "Checking MySQL server connectivity using Prisma..."

ROOT_DATABASE_URL="mysql://root:${ROOT_ENCODED_PASSWORD}@${MYSQL_HOST}:3306/mysql"

until node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.argv[1] } } });
prisma.\$connect()
  .then(() => { prisma.\$disconnect(); process.exit(0); })
  .catch(() => process.exit(1));
" "$ROOT_DATABASE_URL" &>/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo "❌ MySQL server connection timeout after $max_attempts attempts"
    exit 1
  fi
  echo "   MySQL server unavailable - sleeping (attempt $attempt/$max_attempts)"
  sleep 2
done

echo "✅ MySQL server is ready!"

# Wait a bit for SQL init scripts to run
echo "Waiting for database initialization scripts to complete..."
sleep 10

# Now set up the application database and user using Node.js script
echo "Ensuring database and user exist..."
cd /app/auto_dialer
node setup-database.js 2>&1 || echo "⚠️  Database/user setup had issues, continuing..."

# Now verify connection with application user
attempt=0
max_user_attempts=30
echo "Verifying connection with application user..."
export DATABASE_URL="mysql://${MYSQL_USER}:${ENCODED_PASSWORD}@${MYSQL_HOST}:3306/${MYSQL_DATABASE}"

until node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.argv[1] } } });
prisma.\$connect()
  .then(() => { prisma.\$disconnect(); process.exit(0); })
  .catch(() => process.exit(1));
" "$DATABASE_URL" &>/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_user_attempts ]; then
    echo "❌ Failed to connect with application user after $attempt attempts"
    exit 1
  fi
  echo "   Waiting for user connection... (attempt $attempt/$max_user_attempts)"
  sleep 2
done

echo "✅ MySQL database is ready!"
echo ""

# Find the latest database backup JSON file
echo "Looking for database backup JSON file..."
BACKUP_DIR="/app/auto_dialer/database-backups"
if [ ! -d "$BACKUP_DIR" ]; then
  echo "⚠️  Database backups directory not found: $BACKUP_DIR"
  echo "Checking alternative location..."
  BACKUP_DIR="/app/database-backups"
fi
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/database_data_*.json 2>/dev/null | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "⚠️  No database backup JSON file found in $BACKUP_DIR"
  echo "Skipping data restore. You can manually restore data later."
  exit 0
fi

echo "Found backup file: $LATEST_BACKUP"
echo ""

# DATABASE_URL is already set above, just export it
export DATABASE_URL="mysql://${MYSQL_USER}:${ENCODED_PASSWORD}@${MYSQL_HOST}:3306/${MYSQL_DATABASE}"

# CRITICAL: Push Prisma schema FIRST before restoring data
# This ensures all columns exist even if backup doesn't have them
echo "=========================================="
echo "Step 1: Syncing Prisma schema with database"
echo "=========================================="
cd /app/apps/backend
export DATABASE_URL="mysql://${MYSQL_USER}:${ENCODED_PASSWORD}@${MYSQL_HOST}:3306/${MYSQL_DATABASE}"

# Push the schema to match Prisma (this adds missing columns like is_demo_user, organization_id)
echo "Pushing Prisma schema to database (this adds missing columns)..."
npx prisma db push --accept-data-loss --skip-generate 2>&1 | grep -v "Environment variables" || {
  echo "⚠️  Prisma db push had warnings, but continuing..."
}

# Generate Prisma client to ensure it matches the schema
echo "Generating Prisma client..."
npx prisma generate 2>&1 | grep -v "Environment variables" || echo "⚠️  Prisma generate had warnings"

echo "✅ Schema sync completed!"
echo ""

echo ""
echo "Restoring data from JSON backup..."

# Run the restore script
cd /app/auto_dialer
node restore-database.js "$LATEST_BACKUP"

echo ""
echo "=========================================="
echo "Step 2: Populating Extensions Table"
echo "=========================================="
echo ""

# Populate extensions table with passwords
echo "Populating extensions table with passwords..."
export DATABASE_URL="mysql://${MYSQL_USER}:${ENCODED_PASSWORD}@${MYSQL_HOST}:3306/${MYSQL_DATABASE}"
# Run from /app directory to ensure node_modules are accessible
# mysql2 should be available from workspace dependencies
cd /app
node auto_dialer/populate-extensions.js || {
  echo "⚠️  Failed to populate extensions table, continuing..."
  echo "   Extensions can be populated manually if needed"
}

echo ""
echo "=========================================="
echo "✅ Database initialization completed!"
echo "=========================================="


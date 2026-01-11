#!/bin/sh
set -e

# Construct database URL from environment variables if DATABASE_URL is not set
if [ -z "$DATABASE_URL" ] && [ -n "$MYSQL_HOST" ]; then
  MYSQL_HOST=${MYSQL_HOST:-mysql}
  MYSQL_USER=${MYSQL_USER:-demandify}
  MYSQL_PASSWORD=${MYSQL_PASSWORD:-Demandify@765}
  MYSQL_DATABASE=${MYSQL_DATABASE:-demandify_db}
  
  # URL encode password using Node.js (more reliable than sed)
  ENCODED_PASSWORD=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$MYSQL_PASSWORD" 2>/dev/null || echo "$MYSQL_PASSWORD" | sed 's/@/%40/g' | sed 's/#/%23/g' | sed 's/%/%25/g' | sed 's/ /%20/g')
  
  export DATABASE_URL="mysql://${MYSQL_USER}:${ENCODED_PASSWORD}@${MYSQL_HOST}:3306/${MYSQL_DATABASE}"
  echo "✅ Constructed DATABASE_URL from environment variables"
fi

# Wait for MySQL to be ready if MYSQL_HOST is set
if [ -n "$MYSQL_HOST" ] && [ -n "$DATABASE_URL" ]; then
  echo "Waiting for MySQL to be ready..."
  
  max_attempts=30
  attempt=0
  
  while [ $attempt -lt $max_attempts ]; do
    # Try to connect using Prisma
    if node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => { prisma.\$disconnect(); process.exit(0); }).catch(() => process.exit(1));" 2>/dev/null; then
      echo "✅ Database is ready!"
      break
    fi
    
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
      echo "⚠️  Warning: Database connection timeout. Continuing anyway..."
      break
    fi
    
    echo "   Database unavailable - sleeping (attempt $attempt/$max_attempts)"
    sleep 2
  done
fi

# Run Prisma migrations and sync schema if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  cd /app/apps/backend
  echo "Syncing Prisma schema with database..."
  # First, regenerate Prisma client to ensure it's up to date
  npx prisma generate 2>&1 || echo "⚠️  Prisma generate had warnings"
  
  # Then push schema to ensure all columns exist
  echo "Pushing Prisma schema (ensuring all columns exist)..."
  npx prisma db push --accept-data-loss --skip-generate 2>&1 || {
    echo "⚠️  Prisma db push had issues, trying migrate deploy..."
    npx prisma migrate deploy 2>&1 || echo "⚠️  Migrations already applied or not needed"
  }
  
  # Regenerate Prisma client again after schema changes
  npx prisma generate 2>&1 || echo "⚠️  Prisma generate had warnings"
fi

# Execute the main command
cd /app/apps/backend
echo "Starting backend server..."
exec "$@"


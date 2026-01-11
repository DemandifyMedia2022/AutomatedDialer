# Database Backup Files

This directory contains backups of the database schema and data.

## Backup Files

- **`database_data_YYYY-MM-DDTHH-MM-SS.json`** - Complete database data export in JSON format
- **`schema_YYYY-MM-DDTHH-MM-SS.prisma`** - Prisma schema file
- **`backup_summary_YYYY-MM-DDTHH-MM-SS.json`** - Backup summary with statistics

## Latest Backup

**Timestamp:** 2026-01-09T16-08-22

**Statistics:**
- Total Records: 142,317
- Users: 18
- Organizations: 2
- Calls: 211
- Campaigns: 3
- Agent Sessions: 267
- Agent Presence Events: 11,097
- Agent Breaks: 13
- Break Reasons: 5
- Password Resets: 1
- API Metrics: 130,700

## How to Restore

### Option 1: Restore from JSON (Recommended)

1. Copy the backup script to the backend container:
   ```bash
   docker compose cp restore-database.js backend:/app/
   ```

2. Run the restore script:
   ```bash
   docker compose exec backend sh -c "cd /app && node restore-database.js database-backups/database_data_YYYY-MM-DDTHH-MM-SS.json"
   ```

### Option 2: Restore Schema Only

1. Copy the schema file:
   ```bash
   cp database-backups/schema_YYYY-MM-DDTHH-MM-SS.prisma apps/backend/prisma/schema.prisma
   ```

2. Push the schema to the database:
   ```bash
   docker compose exec backend sh -c "cd /app/apps/backend && npx prisma db push"
   ```

## Creating a New Backup

Run the backup script:
```bash
docker compose exec backend sh -c "cd /app && node backup-database-prisma.js"
```

Or from the host:
```bash
docker compose exec backend sh -c "cd /app && node backup-database-prisma.js"
docker compose cp backend:/app/database-backups ./database-backups
```

## File Sizes

- Data file: ~56 MB
- Schema file: ~41 KB
- Summary file: ~485 bytes


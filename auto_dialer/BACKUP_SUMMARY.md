# Database Backup Data Summary

All backup data has been moved to this directory from `/Users/medharadavidraju/Downloads/AutomatedDialer`.

## Backup Files Location

All backups are in the `database-backups/` directory:

### Main Backup Files

1. **database_data_2026-01-09T16-11-09.json** (96MB)
   - Most recent complete database backup
   - Contains all tables and data
   - Created: January 9, 2026 at 16:11:09

2. **database_data_2026-01-09T16-08-22.json** (56MB)
   - Earlier database backup
   - Created: January 9, 2026 at 16:08:22

3. **schema_2026-01-09T16-11-09.prisma**
   - Prisma schema file (latest)
   - Database structure definition

4. **schema_2026-01-09T16-08-22.prisma**
   - Earlier Prisma schema file

5. **backup_summary_2026-01-09T16-11-09.json**
   - Summary of the latest backup
   - Contains counts and metadata

6. **backup_summary_2026-01-09T16-08-22.json**
   - Summary of earlier backup

### Documentation

- **BACKUP_REPORT.md** - Verification report of the backup
- **README.md** - Backup process documentation

## Backup Scripts

- **backup-database-prisma.js** - Script to create new backups
- **restore-database.js** - Script to restore from backup
- **verify-backup.js** - Script to verify backup integrity
- **backup-database.sh** - Shell script for backup operations

## Usage

### Restore Database

```bash
# Using the restore script
node restore-database.js database-backups/database_data_2026-01-09T16-11-09.json
```

### Verify Backup

```bash
# Verify backup integrity
node verify-backup.js database-backups/database_data_2026-01-09T16-11-09.json
```

### Create New Backup

```bash
# Create a new backup
node backup-database-prisma.js
```

## Data Contents

The backup contains the following data (from latest backup):
- 18 users
- 211 calls
- 2 organizations
- 3 campaigns
- Plus all other related tables (agent_sessions, agent_presence_events, api_metrics, etc.)

## Notes

- All backup files use JSON format
- BigInt values are serialized as strings
- DateTime values are in ISO format
- The most recent backup (16-11-09) is the recommended one to use


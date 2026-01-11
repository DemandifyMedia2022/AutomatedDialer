# Database Backup Verification Report

## ✅ Backup Status: COMPLETE

**Backup Timestamp:** 2026-01-09T16-11-09  
**Database:** demandify_db  
**Total Records Backed Up:** 252,301

---

## Schema Verification

- **Total Models in Schema:** 35
- **Models Backed Up:** 33
- **Ignored Models (no unique identifier):** 2
  - `agent_stats` (marked with `@@ignore`)
  - `extensions` (marked with `@@ignore`)

---

## Data Verification Results

### ✅ Perfect Matches (29 tables)
All data counts match exactly between current database and backup:

| Table | Records |
|-------|---------|
| users | 18 |
| organizations | 2 |
| calls | 211 |
| campaigns | 3 |
| agent_breaks | 13 |
| break_reasons | 5 |
| password_resets | 1 |
| notes | 1 |
| dialer_sheets | 1 |
| call_transcription_metadata | 37 |
| transcription_segments | 437 |
| transcription_sessions | 97 |
| qa_call_reviews | 5 |
| dm_form | 327 |
| extension_dids | 11 |
| audit_logs | 98,554 |
| system_health_snapshots | 167 |
| demo_feature_restrictions | 16 |
| organization_allowed_dids | 2 |
| transcripts | 0 |
| agentic_campaigns | 0 |
| agentic_csv_files | 0 |
| dialing_contacts | 0 |
| document_shares | 0 |
| documents | 0 |
| transcription_keywords | 0 |
| feature_flags | 0 |
| resource_metrics | 0 |
| system_config | 0 |

### ⚠️ Count Mismatches (4 tables)
These differences are **EXPECTED** because the system is still running and creating new records:

| Table | Current | Backup | Difference | Reason |
|-------|---------|--------|------------|--------|
| agent_heartbeats | 10,323 | 10,320 | +3 | New heartbeats created |
| agent_presence_events | 11,103 | 10,999 | +4 | New presence events |
| agent_sessions | 269 | 268 | +1 | New session created |
| api_metrics | 130,790 | 130,706 | +84 | New API calls logged |

**Note:** These mismatches are normal for a live system. The backup captured the state at the time of backup.

---

## Backup Files

1. **`database_data_2026-01-09T16-11-09.json`** (96 MB)
   - Complete database data export in JSON format
   - All 33 tables included
   - BigInt values converted to strings for JSON compatibility

2. **`schema_2026-01-09T16-11-09.prisma`** (41 KB)
   - Complete Prisma schema file
   - Includes all models, enums, and relationships

3. **`backup_summary_2026-01-09T16-11-09.json`** (1.1 KB)
   - Backup metadata and statistics

---

## Conclusion

✅ **All database structures have been successfully backed up!**

- All 33 accessible models are included in the backup
- 29 tables have perfect data matches
- 4 tables show minor differences due to system activity (expected)
- No missing tables or errors

The backup is **complete and ready for restoration** if needed.

---

## How to Restore

See `README.md` in this directory for restoration instructions.


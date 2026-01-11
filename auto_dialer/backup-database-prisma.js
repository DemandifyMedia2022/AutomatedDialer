// Prisma Database Backup Script
// This script exports the database schema and all data

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = path.join(__dirname, 'database-backups');
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  console.log('==========================================');
  console.log('Database Backup Script');
  console.log('==========================================');
  console.log(`Timestamp: ${timestamp}`);
  console.log('');
  
  try {
    // Get all tables from Prisma schema (excluding ignored models)
    const tables = [
      'users',
      'organizations', 
      'calls',
      'campaigns',
      'agent_sessions',
      'agent_presence_events',
      'agent_breaks',
      'agent_heartbeats',
      'break_reasons',
      'password_resets',
      'api_metrics',
      'transcripts',
      'agentic_campaigns',
      'agentic_csv_files',
      'dialing_contacts',
      'document_shares',
      'documents',
      'notes',
      'dialer_sheets',
      'call_transcription_metadata',
      'transcription_keywords',
      'transcription_segments',
      'transcription_sessions',
      'qa_call_reviews',
      'dm_form',
      'extension_dids',
      'audit_logs',
      'feature_flags',
      'resource_metrics',
      'system_config',
      'system_health_snapshots',
      'demo_feature_restrictions',
      'organization_allowed_dids'
      // Note: 'agent_stats' and 'extensions' are ignored (no unique identifier)
    ];
    
    const allData = {};
    const stats = {};
    
    console.log('Exporting data from tables...');
    console.log('');
    
    for (const table of tables) {
      try {
        // Use dynamic property access
        const model = prisma[table];
        if (model && typeof model.findMany === 'function') {
          const data = await model.findMany({
            // Include relations if they exist
            include: table === 'users' ? { organizations: true } : undefined,
          });
          allData[table] = data;
          stats[table] = data.length;
          console.log(`✅ ${table}: ${data.length} records`);
        } else {
          console.log(`⚠️  ${table}: Model not available`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
        allData[table] = [];
        stats[table] = 0;
      }
    }
    
    // Convert BigInt to string for JSON serialization
    function convertBigInt(obj) {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return obj.toString();
      if (Array.isArray(obj)) return obj.map(convertBigInt);
      if (typeof obj === 'object') {
        const converted = {};
        for (const [key, value] of Object.entries(obj)) {
          converted[key] = convertBigInt(value);
        }
        return converted;
      }
      return obj;
    }
    
    // Save data to JSON file
    const dataFile = path.join(backupDir, `database_data_${timestamp}.json`);
    const convertedData = convertBigInt(allData);
    fs.writeFileSync(dataFile, JSON.stringify(convertedData, null, 2));
    console.log('');
    console.log(`✅ Data exported to: ${dataFile}`);
    console.log(`   File size: ${(fs.statSync(dataFile).size / 1024 / 1024).toFixed(2)} MB`);
    
    // Copy Prisma schema
    const schemaPath = path.join(__dirname, 'apps', 'backend', 'prisma', 'schema.prisma');
    if (fs.existsSync(schemaPath)) {
      const schemaBackup = path.join(backupDir, `schema_${timestamp}.prisma`);
      fs.copyFileSync(schemaPath, schemaBackup);
      console.log(`✅ Schema backed up to: ${schemaBackup}`);
    }
    
    // Create summary
    const summary = {
      timestamp,
      database: process.env.DATABASE_URL ? process.env.DATABASE_URL.split('/').pop() : 'unknown',
      recordCounts: stats,
      totalRecords: Object.values(stats).reduce((a, b) => a + b, 0),
      files: {
        data: `database_data_${timestamp}.json`,
        schema: `schema_${timestamp}.prisma`
      }
    };
    
    const summaryFile = path.join(backupDir, `backup_summary_${timestamp}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`✅ Summary saved to: ${summaryFile}`);
    
    console.log('');
    console.log('==========================================');
    console.log('Backup Statistics:');
    console.log('==========================================');
    Object.entries(stats).forEach(([table, count]) => {
      console.log(`  ${table}: ${count} records`);
    });
    console.log(`  Total: ${summary.totalRecords} records`);
    console.log('');
    console.log('✅ Backup completed successfully!');
    console.log(`   Location: ${backupDir}`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabase().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});


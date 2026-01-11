// Database Restore Script
// This script restores database data from a JSON backup file

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Use DATABASE_URL from environment if available, otherwise use default
const databaseUrl = process.env.DATABASE_URL || 'mysql://demandify:Demandify@765@mysql:3306/demandify_db';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function restoreDatabase(backupFile) {
  if (!backupFile) {
    console.error('❌ Error: Please provide a backup file path');
    console.log('Usage: node restore-database.js <backup-file.json>');
    process.exit(1);
  }

  const backupPath = path.isAbsolute(backupFile) ? backupFile : path.join(__dirname, backupFile);
  
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Error: Backup file not found: ${backupPath}`);
    process.exit(1);
  }

  console.log('==========================================');
  console.log('Database Restore Script');
  console.log('==========================================');
  console.log(`Backup file: ${backupPath}`);
  console.log('');

  try {
    // Read backup data
    console.log('Reading backup file...');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log(`✅ Backup file loaded`);
    console.log('');

    // Get table names
    const tables = Object.keys(backupData);
    console.log(`Found ${tables.length} tables to restore`);
    console.log('');

    // Get all tables from backup, but restore in proper order
    const allTables = Object.keys(backupData);
    const priorityTables = ['organizations', 'users', 'campaigns', 'break_reasons'];
    const restoreOrder = [
      ...priorityTables.filter(t => allTables.includes(t)),
      ...allTables.filter(t => !priorityTables.includes(t))
    ];

    console.log(`Found ${allTables.length} tables in backup: ${allTables.join(', ')}`);
    console.log('');
    console.log('⚠️  WARNING: This will DELETE existing data and restore from backup!');
    console.log('   Starting restore in 3 seconds...');
    console.log('');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    for (const table of restoreOrder) {
      if (!backupData[table] || !Array.isArray(backupData[table])) {
        console.log(`⚠️  Skipping ${table}: No data or invalid format`);
        continue;
      }

      try {
        const model = prisma[table];
        if (!model) {
          console.log(`⚠️  Skipping ${table}: Model not available`);
          continue;
        }

        const data = backupData[table];
        if (data.length === 0) {
          console.log(`✅ ${table}: No data to restore`);
          continue;
        }

        console.log(`Restoring ${table}... (${data.length} records)`);

        // Delete existing data before restoring
        console.log(`  Clearing existing data in ${table}...`);
        try {
          await model.deleteMany({});
        } catch (err) {
          console.warn(`  Warning: Could not clear ${table}:`, err.message);
        }

        // Restore data in batches
        const batchSize = 100;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          
          // Convert data types back to proper formats and remove relation fields
          const processedBatch = batch.map(record => {
            const processed = {};
            // Handle all fields, excluding relations
            Object.keys(record).forEach(key => {
              // Skip relation fields (these are objects/arrays that represent relations)
              if (key === 'organizations' || (typeof record[key] === 'object' && record[key] !== null && !Array.isArray(record[key]) && !(record[key] instanceof Date) && !record[key].$date)) {
                return; // Skip this field
              }
              
              // Skip fields that don't exist in current schema (backup might be older)
              // We'll let Prisma handle validation
              
              const value = record[key];
              
              // Set default values for fields that might not exist in backup but are required in schema
              if (key === 'is_demo_user' && (value === null || value === undefined)) {
                processed[key] = false;
                return;
              }
              
              // Handle DateTime fields - convert from ISO string or object to Date
              if (key.includes('time') || key.includes('date') || key === 'created_at' || key === 'updated_at' || key === 'timestamp') {
                if (value && typeof value === 'object' && !(value instanceof Date)) {
                  // If it's an object, try to extract ISO string or convert
                  if (value.$date || value.iso) {
                    processed[key] = new Date(value.$date || value.iso);
                  } else if (Object.keys(value).length === 0) {
                    processed[key] = null;
                  } else {
                    processed[key] = null;
                  }
                } else if (typeof value === 'string' && value) {
                  try {
                    processed[key] = new Date(value);
                  } catch {
                    processed[key] = null;
                  }
                } else if (!value || value === 'null') {
                  processed[key] = null;
                } else {
                  processed[key] = value;
                }
              } else {
                // Handle BigInt/number fields - convert string representations back
                if (typeof value === 'string' && /^\d+$/.test(value)) {
                  // Check if this is likely a numeric field
                  if (key === 'id' || key.endsWith('_id') || key.includes('count') || key.includes('total') || key.includes('response_time')) {
                    const num = Number(value);
                    if (!isNaN(num) && num <= Number.MAX_SAFE_INTEGER) {
                      processed[key] = num;
                    } else {
                      processed[key] = value; // Keep as string for very large numbers
                    }
                  } else {
                    processed[key] = value;
                  }
                } else if (value === 'null' || (typeof value === 'object' && value !== null && Object.keys(value).length === 0 && !(value instanceof Date))) {
                  processed[key] = null;
                } else {
                  processed[key] = value;
                }
              }
            });
            
            // Ensure required fields have default values if backup doesn't have them
            if (table === 'users') {
              if (processed.is_demo_user === null || processed.is_demo_user === undefined) {
                processed.is_demo_user = false;
              }
              // organization_id can be null, so we leave it as is
            }
            
            return processed;
          });

          try {
            // Use createMany for better performance
            if (typeof model.createMany === 'function') {
              const result = await model.createMany({
                data: processedBatch,
                skipDuplicates: true
              });
              if (i === 0 && processedBatch.length > 0) {
                console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1} (${result.count} records)`);
              }
            } else {
              // Fallback to individual creates
              let successCount = 0;
              for (const record of processedBatch) {
                try {
                  await model.create({ data: record });
                  successCount++;
                } catch (err) {
                  // Skip duplicates or errors
                  if (!err.message.includes('Unique constraint') && !err.message.includes('duplicate')) {
                    console.error(`  Error restoring record in ${table}:`, err.message);
                  }
                }
              }
              if (i === 0 && processedBatch.length > 0) {
                console.log(`  Inserted ${successCount}/${processedBatch.length} records in batch ${Math.floor(i / batchSize) + 1}`);
              }
            }
          } catch (err) {
            console.error(`  Error restoring batch ${Math.floor(i / batchSize) + 1} in ${table}:`, err.message);
            console.error(`  First record in batch:`, JSON.stringify(processedBatch[0], null, 2).substring(0, 200));
          }
        }

        console.log(`✅ ${table}: Restored ${data.length} records`);
      } catch (err) {
        console.error(`❌ Error restoring ${table}:`, err.message);
      }
    }

    console.log('');
    console.log('==========================================');
    console.log('✅ Restore completed!');
    console.log('==========================================');

  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get backup file from command line argument
const backupFile = process.argv[2];
restoreDatabase(backupFile).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});


// Database Backup Verification Script
// This script verifies that all database structures and data were backed up correctly

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function verifyBackup() {
  console.log('==========================================');
  console.log('Database Backup Verification Report');
  console.log('==========================================');
  console.log('');

  // Read the backup summary
  const backupDir = path.join(__dirname, 'database-backups');
  const backupFiles = fs.readdirSync(backupDir).filter(f => f.startsWith('backup_summary_'));
  
  if (backupFiles.length === 0) {
    console.log('❌ No backup summary files found');
    return;
  }

  const latestBackup = backupFiles.sort().reverse()[0];
  const backupSummary = JSON.parse(fs.readFileSync(path.join(backupDir, latestBackup), 'utf8'));
  const backupData = JSON.parse(fs.readFileSync(path.join(backupDir, backupSummary.files.data), 'utf8'));

  console.log(`📦 Latest Backup: ${latestBackup}`);
  console.log(`   Timestamp: ${backupSummary.timestamp}`);
  console.log(`   Database: ${backupSummary.database}`);
  console.log('');

  // Get all models from Prisma schema
  const schemaPath = path.join(__dirname, 'apps', 'backend', 'prisma', 'schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const modelMatches = schemaContent.matchAll(/^model\s+(\w+)/gm);
  const allModels = Array.from(modelMatches).map(m => m[1]);

  // Models that are ignored (not accessible via Prisma)
  const ignoredModels = ['agent_stats', 'extensions'];
  
  // Models that should be backed up
  const modelsToBackup = allModels.filter(m => !ignoredModels.includes(m));

  console.log('==========================================');
  console.log('Schema Verification');
  console.log('==========================================');
  console.log(`Total models in schema: ${allModels.length}`);
  console.log(`Models to backup: ${modelsToBackup.length}`);
  console.log(`Ignored models: ${ignoredModels.join(', ')}`);
  console.log('');

  // Check current database counts
  console.log('==========================================');
  console.log('Current Database vs Backup Comparison');
  console.log('==========================================');
  console.log('');

  const verification = {
    backedUp: [],
    missing: [],
    countMismatch: [],
    errors: []
  };

  for (const modelName of modelsToBackup) {
    try {
      const model = prisma[modelName];
      if (!model || typeof model.count !== 'function') {
        verification.missing.push({ model: modelName, reason: 'Model not available in Prisma Client' });
        continue;
      }

      const currentCount = await model.count();
      const backupCount = backupData[modelName] ? backupData[modelName].length : 0;

      if (backupCount === 0 && currentCount === 0) {
        verification.backedUp.push({ model: modelName, current: 0, backup: 0, status: '✅ Empty' });
      } else if (backupCount === currentCount) {
        verification.backedUp.push({ model: modelName, current: currentCount, backup: backupCount, status: '✅ Match' });
      } else {
        verification.countMismatch.push({ 
          model: modelName, 
          current: currentCount, 
          backup: backupCount, 
          difference: currentCount - backupCount,
          status: '⚠️  Count Mismatch' 
        });
      }
    } catch (err) {
      verification.errors.push({ model: modelName, error: err.message });
    }
  }

  // Print results
  console.log('✅ Successfully Backed Up:');
  verification.backedUp.forEach(item => {
    console.log(`   ${item.model}: ${item.current} records (backup: ${item.backup})`);
  });
  console.log('');

  if (verification.countMismatch.length > 0) {
    console.log('⚠️  Count Mismatches (data may have changed since backup):');
    verification.countMismatch.forEach(item => {
      console.log(`   ${item.model}: Current=${item.current}, Backup=${item.backup}, Difference=${item.difference > 0 ? '+' : ''}${item.difference}`);
    });
    console.log('');
  }

  if (verification.missing.length > 0) {
    console.log('❌ Missing from Backup:');
    verification.missing.forEach(item => {
      console.log(`   ${item.model}: ${item.reason}`);
    });
    console.log('');
  }

  if (verification.errors.length > 0) {
    console.log('❌ Errors:');
    verification.errors.forEach(item => {
      console.log(`   ${item.model}: ${item.error}`);
    });
    console.log('');
  }

  // Check backup file structure
  console.log('==========================================');
  console.log('Backup File Structure');
  console.log('==========================================');
  console.log('');
  
  const backupModels = Object.keys(backupData);
  console.log(`Tables in backup: ${backupModels.length}`);
  console.log('');
  
  const missingInBackup = modelsToBackup.filter(m => !backupModels.includes(m));
  const extraInBackup = backupModels.filter(m => !modelsToBackup.includes(m));
  
  if (missingInBackup.length > 0) {
    console.log('⚠️  Models in schema but not in backup:');
    missingInBackup.forEach(m => console.log(`   - ${m}`));
    console.log('');
  }
  
  if (extraInBackup.length > 0) {
    console.log('⚠️  Models in backup but not in current schema:');
    extraInBackup.forEach(m => console.log(`   - ${m}`));
    console.log('');
  }

  // Summary
  console.log('==========================================');
  console.log('Verification Summary');
  console.log('==========================================');
  console.log(`✅ Correctly backed up: ${verification.backedUp.length}`);
  console.log(`⚠️  Count mismatches: ${verification.countMismatch.length}`);
  console.log(`❌ Missing: ${verification.missing.length}`);
  console.log(`❌ Errors: ${verification.errors.length}`);
  console.log('');

  const allGood = verification.missing.length === 0 && 
                  verification.errors.length === 0 && 
                  verification.countMismatch.length === 0;

  if (allGood) {
    console.log('✅ All database structures and data have been successfully backed up!');
  } else {
    console.log('⚠️  Some issues found. Please review the details above.');
  }

  console.log('');
}

verifyBackup()
  .catch(err => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });


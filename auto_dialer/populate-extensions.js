// Script to populate extensions table with passwords
// This should be run after database restore

const { PrismaClient } = require('@prisma/client');
// mysql2 should be available from workspace dependencies (installed in Dockerfile.init)
const mysql = require('mysql2/promise');

const databaseUrl = process.env.DATABASE_URL || 'mysql://demandify:Demandify@765@mysql:3306/demandify_db';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function populateExtensions() {
  let connection = null;
  try {
    console.log('==========================================');
    console.log('Populating Extensions Table');
    console.log('==========================================');
    console.log('');

    // Create MySQL connection directly
    connection = await mysql.createConnection(databaseUrl);

    // Get unique extensions from users table
    const users = await prisma.users.findMany({
      where: {
        extension: { not: null }
      },
      select: {
        extension: true
      },
      distinct: ['extension']
    });

    let extensions = [...new Set(users.map(u => u.extension).filter(Boolean))];
    
    if (extensions.length === 0) {
      console.log('⚠️  No extensions found in users table');
      console.log('   Will insert default extensions from TELXIO_EXTENSIONS_FALLBACK');
      
      // Use fallback extensions from environment or defaults
      const fallbackExtensions = (process.env.TELXIO_EXTENSIONS_FALLBACK || '1033201,1033202,1033203,1033204,1033205,1033206,1033207,1033208,1033209,1033210,1033211').split(',');
      extensions = fallbackExtensions.map(e => e.trim()).filter(Boolean);
    }

    console.log(`Found ${extensions.length} unique extensions to populate: ${extensions.join(', ')}`);
    console.log('');

    // Extension passwords mapping (from user-provided data)
    const extensionPasswords = {
      '1033201': '691867b65b089',
      '1033202': '691867bac5e9e',
      '1033203': '691867be80802',
      '1033204': '691867c807989',
      '1033205': '691867c4e2584',
      '1033206': '691867c27fc01',
      '1033207': '691867cb3da14',
      '1033208': '691867cd7b993',
      '1033209': '691867d03eb04',
      '1033210': '691867d772442',
      '1033211': '691867d487064'
    };

    let insertedCount = 0;
    let updatedCount = 0;

    for (const ext of extensions) {
      const extStr = String(ext).trim();
      if (!extStr) continue;

      // Get password from mapping or use extension as default (fallback)
      const password = extensionPasswords[extStr] || extStr;
      
      try {
        // Check if extension already exists
        const [existing] = await connection.execute(
          'SELECT extension_id FROM extensions WHERE extension_id = ? LIMIT 1',
          [extStr]
        );

        if (existing && existing.length > 0) {
          // Update existing extension password
          await connection.execute(
            'UPDATE extensions SET password = ?, updated_at = NOW() WHERE extension_id = ?',
            [password, extStr]
          );
          updatedCount++;
          console.log(`✅ Updated extension ${extStr} with password`);
        } else {
          // Insert new extension
          await connection.execute(
            'INSERT INTO extensions (extension_id, password, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
            [extStr, password]
          );
          insertedCount++;
          console.log(`✅ Inserted extension ${extStr} with password`);
        }
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          // Duplicate entry, try update instead
          try {
            await connection.execute(
              'UPDATE extensions SET password = ?, updated_at = NOW() WHERE extension_id = ?',
              [password, extStr]
            );
            updatedCount++;
            console.log(`✅ Updated extension ${extStr} (was duplicate)`);
          } catch (updateErr) {
            console.warn(`⚠️  Failed to update extension ${extStr}:`, updateErr.message);
          }
        } else {
          console.warn(`⚠️  Failed to insert extension ${extStr}:`, err.message);
        }
      }
    }

    console.log('');
    console.log('==========================================');
    console.log(`✅ Extensions population completed!`);
    console.log(`   Inserted: ${insertedCount}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log('==========================================');

  } catch (error) {
    console.error('❌ Failed to populate extensions:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
    await prisma.$disconnect();
  }
}

populateExtensions().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});


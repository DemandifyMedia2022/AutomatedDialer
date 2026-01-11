// Database Setup Script
// Creates database and user if they don't exist

const mysql = require('mysql2/promise');

async function setupDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'mysql',
      user: 'root',
      password: process.env.MYSQL_ROOT_PASSWORD || 'rootpassword',
      multipleStatements: true
    });
    
    const database = process.env.MYSQL_DATABASE || 'demandify_db';
    const user = process.env.MYSQL_USER || 'demandify';
    const password = process.env.MYSQL_PASSWORD || 'Demandify@765';
    
    await connection.query(`
      CREATE DATABASE IF NOT EXISTS \`${database}\`;
      CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?;
      GRANT ALL PRIVILEGES ON \`${database}\`.* TO ?@'%';
      FLUSH PRIVILEGES;
    `, [user, password, user]);
    
    await connection.end();
    console.log('✅ Database and user setup completed');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database:', error.message);
    process.exit(1);
  }
}

setupDatabase();


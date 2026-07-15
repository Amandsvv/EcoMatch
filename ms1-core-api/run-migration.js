const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://ecomatch:ecomatch@127.0.0.1:5433/ecomatch';

console.log('Connecting to database:', connectionString.replace(/:[^:@]+@/, ':****@'));

const client = new Client({
  connectionString,
});

async function main() {
  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL.');

    const sqlFilePath = path.join(__dirname, 'migrations', '0000_modern_chameleon.sql');
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`Migration SQL file not found at ${sqlFilePath}. Run "npx drizzle-kit generate" first.`);
    }

    console.log('Reading migration file...');
    const rawSql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Drizzle splits statements with '--> statement-breakpoint'
    const statements = rawSql
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute.`);

    await client.query('BEGIN');
    
    console.log('Cleaning public schema to ensure a fresh, consistent migration...');
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      // Log the first line of the statement for clarity
      const firstLine = statement.split('\n')[0].substring(0, 60);
      console.log(`Executing [${i + 1}/${statements.length}]: ${firstLine}...`);
      
      await client.query(statement);
    }

    await client.query('COMMIT');
    console.log('✓ Migration executed successfully! All tables created.');
  } catch (err) {
    console.error('✗ Migration failed!');
    console.error(err);
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // ignore rollback errors if connection died
    }
  } finally {
    await client.end();
  }
}

main();

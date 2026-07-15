const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://ecomatch:ecomatch@127.0.0.1:5433/ecomatch',
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to PG successfully!');
    
    // Check tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public'
    `);
    console.log('Tables found:', res.rows.map(r => r.table_name));
    
  } catch (err) {
    console.error('Error connecting to database:', err);
  } finally {
    await client.end();
  }
}

main();

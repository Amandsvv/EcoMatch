import { getDb } from '../src/db';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = getDb();
  try {
    const info = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'`);
    console.log('Columns in users table:', JSON.stringify(info.rows, null, 2));

    const users = await db.execute(sql`SELECT email, email_verified, email_verification_token, email_verification_expiry FROM users ORDER BY created_at DESC LIMIT 5`);
    console.log('Recent users:', JSON.stringify(users.rows, null, 2));
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();

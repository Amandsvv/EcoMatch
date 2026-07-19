import { getDb, schema } from '../src/db';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = getDb();
  const email = 'aman.kg4006@gmail.com';
  
  // Find user
  const user = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (user.length === 0) {
    console.log(`User with email ${email} not found.`);
    process.exit(0);
  }
  
  console.log('Found user to delete:', user[0]);
  
  // Delete user (cascades automatically to businesses, submissions, matches, etc.)
  await db.delete(schema.users).where(eq(schema.users.id, user[0].id));
  console.log(`User ${email} and all associated records deleted successfully.`);
  process.exit(0);
}

run();

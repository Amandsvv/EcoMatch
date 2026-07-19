import { getDb, schema } from '../src/db';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = getDb();
  try {
    const user = await db.select().from(schema.users).where(eq(schema.users.email, 'amandsvv4006@gmail.com')).limit(1);
    if (user[0]) {
      const u = user[0];
      console.log('User emailVerificationExpiry type:', typeof u.emailVerificationExpiry);
      console.log('User emailVerificationExpiry raw:', u.emailVerificationExpiry);
      console.log('User emailVerificationExpiry ISO:', u.emailVerificationExpiry?.toISOString());
      console.log('Current Date ISO:', new Date().toISOString());
      console.log('Is Current Date > Expiry?', new Date() > new Date(u.emailVerificationExpiry!));
    } else {
      console.log('User not found');
    }
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();

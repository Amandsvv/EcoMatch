import { getDb, schema } from '../src/db';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = getDb();
  const allBusinesses = await db.select().from(schema.businesses);
  console.log('ALL BUSINESSES IN DB:', JSON.stringify(allBusinesses, null, 2));
  const allUsers = await db.select().from(schema.users);
  console.log('ALL USERS IN DB:', JSON.stringify(allUsers, null, 2));
  process.exit(0);
}

run();

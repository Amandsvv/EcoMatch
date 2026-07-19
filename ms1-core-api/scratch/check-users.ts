import { getDb, schema } from '../src/db';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = getDb();
  const allUsers = await db.select().from(schema.users);
  console.log('ALL USERS IN DB:', allUsers);
  process.exit(0);
}

run();

import { getDb, schema } from '../src/db';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = getDb();
  const allMatches = await db.select().from(schema.matches);
  console.log('ALL MATCHES IN DB:', allMatches);
  process.exit(0);
}

run();

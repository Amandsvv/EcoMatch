import { getDb, schema } from '../src/db';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const db = getDb();
  const submissions = await db.select().from(schema.submissions);
  
  console.log('--- SUBMISSIONS AND CLASSIFICATIONS ---');
  for (const sub of submissions) {
    const cls = await db.select().from(schema.materialClassifications).where(eq(schema.materialClassifications.submissionId, sub.id));
    console.log({
      id: sub.id,
      description: sub.rawDescription,
      status: sub.status,
      classification: cls[0] ? {
        primaryCategory: cls[0].primaryCategory,
        confidence: cls[0].confidence,
        hazardFlag: cls[0].hazardFlag
      } : 'NONE'
    });
  }
  process.exit(0);
}

check();

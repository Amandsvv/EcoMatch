import { getDb, schema } from '../src/db';
import { eq, inArray } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

// Submission IDs to delete (all the auto-accepted ones from today's broken tests)
const SUBMISSION_IDS = [
  'd2643132-235a-4481-88f1-62efa3a12521', // both_accepted (latest)
  '285c4803-2312-4f75-998e-6896947c3e84', // both_accepted
  '4707220a-bd74-4028-afc7-ce2ac4bf4204', // both_accepted
];

async function run() {
  const db = getDb();

  for (const subId of SUBMISSION_IDS) {
    // Find and delete match + cascades
    const match = await db.select().from(schema.matches)
      .where(eq(schema.matches.submissionId, subId)).limit(1);
    
    if (match[0]) {
      const matchId = match[0].id;
      console.log(`Cleaning match ${matchId} for submission ${subId}...`);
      
      // Delete cascading records
      await db.delete(schema.certificates).where(eq(schema.certificates.matchId, matchId));
      await db.delete(schema.verificationRecords).where(eq(schema.verificationRecords.matchId, matchId));
      await db.delete(schema.outreachDrafts).where(eq(schema.outreachDrafts.matchId, matchId));
      await db.delete(schema.dealEvents).where(eq(schema.dealEvents.matchId, matchId));
      await db.delete(schema.logisticsBookings).where(eq(schema.logisticsBookings.matchId, matchId));
      await db.delete(schema.matches).where(eq(schema.matches.id, matchId));
    }
    
    // Delete submission + classification
    await db.delete(schema.materialClassifications)
      .where(eq(schema.materialClassifications.submissionId, subId));
    await db.delete(schema.submissions).where(eq(schema.submissions.id, subId));
    console.log(`Deleted submission ${subId}`);
  }

  console.log('\nDone! All broken submissions cleaned up. Ready for a fresh test.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

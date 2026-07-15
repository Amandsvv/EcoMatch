import { eq, and, or } from 'drizzle-orm';
import { getDb, schema } from '../../db';

export class VerificationRepository {
  async getMatchById(matchId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.id, matchId))
      .limit(1);
    return result[0] || null;
  }

  async getBusinessByMatchAndUserId(match: typeof schema.matches.$inferSelect, userId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.businesses)
      .where(and(
        or(
          eq(schema.businesses.id, match.sourceBusinessId),
          eq(schema.businesses.id, match.targetBusinessId)
        ),
        eq(schema.businesses.userId, userId)
      ))
      .limit(1);
    return result[0] || null;
  }

  async getUserBusiness(userId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.userId, userId))
      .limit(1);
    return result[0] || null;
  }

  async getVerificationRecord(matchId: string, businessId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.verificationRecords)
      .where(and(
        eq(schema.verificationRecords.matchId, matchId),
        eq(schema.verificationRecords.businessId, businessId)
      ))
      .limit(1);
    return result[0] || null;
  }

  async createVerificationAndLog(
    verification: typeof schema.verificationRecords.$inferInsert,
    dealEvent: typeof schema.dealEvents.$inferInsert
  ) {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.insert(schema.verificationRecords).values(verification);
      await tx.insert(schema.dealEvents).values(dealEvent);
    });
  }

  async logVerificationEvidence(dealEvent: typeof schema.dealEvents.$inferInsert) {
    const db = getDb();
    await db.insert(schema.dealEvents).values(dealEvent);
  }

  async confirmVerificationAndLog(
    recordId: string,
    dealEvent: typeof schema.dealEvents.$inferInsert
  ) {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx
        .update(schema.verificationRecords)
        .set({
          confirmed: true,
          confirmedAt: new Date(),
        })
        .where(eq(schema.verificationRecords.id, recordId));
      await tx.insert(schema.dealEvents).values(dealEvent);
    });
  }

  async getVerificationRecordsByMatchId(matchId: string) {
    const db = getDb();
    return db
      .select()
      .from(schema.verificationRecords)
      .where(eq(schema.verificationRecords.matchId, matchId));
  }
}

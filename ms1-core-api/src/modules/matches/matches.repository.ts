import { eq, and, or } from 'drizzle-orm';
import { getDb, schema } from '../../db';

export class MatchesRepository {
  async getBusinessByIdAndUserId(businessId: string, userId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.businesses)
      .where(and(
        eq(schema.businesses.id, businessId),
        eq(schema.businesses.userId, userId)
      ))
      .limit(1);
    return result[0] || null;
  }

  async getMatchesByBusinessId(businessId: string) {
    const db = getDb();
    return db
      .select()
      .from(schema.matches)
      .where(or(
        eq(schema.matches.sourceBusinessId, businessId),
        eq(schema.matches.targetBusinessId, businessId)
      ));
  }

  async getMatchById(matchId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.id, matchId))
      .limit(1);
    return result[0] || null;
  }

  async getMatchBySubmissionId(submissionId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.submissionId, submissionId))
      .limit(1);
    return result[0] || null;
  }

  async getOutreachDraftsByMatchId(matchId: string) {
    const db = getDb();
    return db
      .select()
      .from(schema.outreachDrafts)
      .where(eq(schema.outreachDrafts.matchId, matchId));
  }

  async getDealEventsByMatchId(matchId: string) {
    const db = getDb();
    return db
      .select()
      .from(schema.dealEvents)
      .where(eq(schema.dealEvents.matchId, matchId));
  }
}

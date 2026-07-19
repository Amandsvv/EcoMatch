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

  async getLogisticsBookingByMatchId(matchId: string) {
    const db = getDb();
    const result = await db
      .select({
        booking: schema.logisticsBookings,
        hauler: schema.haulers,
      })
      .from(schema.logisticsBookings)
      .leftJoin(
        schema.haulers,
        eq(schema.logisticsBookings.haulerId, schema.haulers.id)
      )
      .where(eq(schema.logisticsBookings.matchId, matchId))
      .limit(1);

    if (result.length > 0) {
      return {
        ...result[0].booking,
        hauler: result[0].hauler,
      };
    }
    return null;
  }

  async getBusinessById(businessId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.id, businessId))
      .limit(1);
    return result[0] || null;
  }

  async getUserById(userId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    return result[0] || null;
  }

  async getClassificationBySubmissionId(submissionId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.materialClassifications)
      .where(eq(schema.materialClassifications.submissionId, submissionId))
      .limit(1);
    return result[0] || null;
  }

  async getSubmissionById(submissionId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.id, submissionId))
      .limit(1);
    return result[0] || null;
  }

  async saveDraftsAndLogEvent(
    drafts: (typeof schema.outreachDrafts.$inferInsert)[],
    dealEvent: typeof schema.dealEvents.$inferInsert,
    submissionId: string
  ) {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.insert(schema.outreachDrafts).values(drafts);
      await tx.insert(schema.dealEvents).values(dealEvent);
      await tx
        .update(schema.submissions)
        .set({ status: 'proposal_drafted' })
        .where(eq(schema.submissions.id, submissionId));
    });
  }
}


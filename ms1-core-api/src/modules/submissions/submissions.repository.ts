import { eq, and, inArray, desc } from 'drizzle-orm';
import { getDb, schema } from '../../db';

export class SubmissionsRepository {
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

  async getBusinessesByUserId(userId: string) {
    const db = getDb();
    return db
      .select({ id: schema.businesses.id })
      .from(schema.businesses)
      .where(eq(schema.businesses.userId, userId));
  }

  async getSubmissionsByBusinessIds(businessIds: string[]) {
    const db = getDb();
    return db
      .select()
      .from(schema.submissions)
      .where(inArray(schema.submissions.businessId, businessIds));
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

  async saveSubmissionAndClassification(
    submission: typeof schema.submissions.$inferInsert,
    classification: typeof schema.materialClassifications.$inferInsert
  ) {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.insert(schema.submissions).values(submission);
      await tx.insert(schema.materialClassifications).values(classification);
    });
  }

  async ensureUserAndBusinessExist(
    user: typeof schema.users.$inferInsert,
    business: typeof schema.businesses.$inferInsert
  ) {
    const db = getDb();
    const existingUser = user.id ? await this.getUserById(user.id) : null;
    const existingBusiness = business.id ? await this.getBusinessById(business.id) : null;

    await db.transaction(async (tx) => {
      if (!existingUser) {
        await tx.insert(schema.users).values(user);
      }
      if (!existingBusiness) {
        await tx.insert(schema.businesses).values(business);
      }
    });
  }

  async createMatchDealAndDrafts(
    match: typeof schema.matches.$inferInsert,
    dealEvent: typeof schema.dealEvents.$inferInsert,
    drafts: (typeof schema.outreachDrafts.$inferInsert)[]
  ) {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.insert(schema.matches).values(match);
      await tx.insert(schema.dealEvents).values(dealEvent);
      await tx.insert(schema.outreachDrafts).values(drafts);
    });
  }

  async deleteSubmission(submissionId: string, businessId: string) {
    const db = getDb();
    // Verify ownership before delete
    const submission = await db
      .select()
      .from(schema.submissions)
      .where(and(
        eq(schema.submissions.id, submissionId),
        eq(schema.submissions.businessId, businessId)
      ))
      .limit(1);
    if (!submission[0]) return null;
    await db.delete(schema.submissions).where(eq(schema.submissions.id, submissionId));
    return true;
  }
}

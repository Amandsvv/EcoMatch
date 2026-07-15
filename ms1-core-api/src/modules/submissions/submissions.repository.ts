import { eq, and, or, inArray, desc } from 'drizzle-orm';
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

  async getUserByEmail(email: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
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
    const rows = await db
      .select({
        submission: schema.submissions,
        classification: schema.materialClassifications,
        match: schema.matches,
      })
      .from(schema.submissions)
      .leftJoin(
        schema.materialClassifications,
        eq(schema.submissions.id, schema.materialClassifications.submissionId)
      )
      .leftJoin(
        schema.matches,
        eq(schema.submissions.id, schema.matches.submissionId)
      )
      .where(inArray(schema.submissions.businessId, businessIds))
      .orderBy(desc(schema.submissions.createdAt));

    return rows.map((r) => {
      let status = r.submission.status;
      if (r.match) {
        if (r.match.status === 'proposed') {
          status = 'match_proposed';
        } else if (['both_accepted', 'logistics_scheduled', 'completed'].includes(r.match.status)) {
          status = 'both_accepted';
        } else if (r.match.status === 'verified') {
          status = 'verified';
        } else if (r.match.status === 'rejected') {
          status = 'no_match_found';
        }
      }
      return {
        ...r.submission,
        status,
        classification: r.classification || undefined,
        match: r.match || undefined,
      };
    });
  }

  async getSubmissionsForBusinessOrTarget(businessIds: string[]) {
    const db = getDb();
    const rows = await db
      .select({
        submission: schema.submissions,
        classification: schema.materialClassifications,
        match: schema.matches,
      })
      .from(schema.submissions)
      .leftJoin(
        schema.materialClassifications,
        eq(schema.submissions.id, schema.materialClassifications.submissionId)
      )
      .leftJoin(
        schema.matches,
        eq(schema.submissions.id, schema.matches.submissionId)
      )
      .where(or(
        inArray(schema.submissions.businessId, businessIds),
        inArray(schema.matches.targetBusinessId, businessIds)
      ))
      .orderBy(desc(schema.submissions.createdAt));

    return rows.map((r) => {
      let status = r.submission.status;
      if (r.match) {
        if (r.match.status === 'proposed') {
          status = 'match_proposed';
        } else if (['both_accepted', 'logistics_scheduled', 'completed'].includes(r.match.status)) {
          status = 'both_accepted';
        } else if (r.match.status === 'verified') {
          status = 'verified';
        } else if (r.match.status === 'rejected') {
          status = 'no_match_found';
        }
      }
      return {
        ...r.submission,
        status,
        classification: r.classification || undefined,
        match: r.match || undefined,
      };
    });
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

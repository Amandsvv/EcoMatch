import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../db';

export class AdminRepository {
  async getUnconfirmedVerificationRecords() {
    const db = getDb();
    const records = await db
      .select()
      .from(schema.verificationRecords)
      .where(eq(schema.verificationRecords.confirmed, false));

    const matches = await db.select().from(schema.matches);
    const businesses = await db.select().from(schema.businesses);

    const matchMap = new Map(matches.map((m) => [m.id, m]));
    const bizMap = new Map(businesses.map((b) => [b.id, b]));

    return records.map((rec) => {
      const match = matchMap.get(rec.matchId);
      const submittingBiz = bizMap.get(rec.businessId);
      const sourceBiz = match ? bizMap.get(match.sourceBusinessId) : null;
      const targetBiz = match ? bizMap.get(match.targetBusinessId) : null;

      return {
        ...rec,
        submittingBusinessName: submittingBiz?.name || 'Submitting Business',
        submittingBusinessType: submittingBiz?.type || '',
        sourceBusinessId: match?.sourceBusinessId,
        sourceBusinessName: sourceBiz?.name || 'Source Business',
        targetBusinessId: match?.targetBusinessId,
        targetBusinessName: targetBiz?.name || 'Target Business',
      };
    });
  }

  async getProposedMatches() {
    const db = getDb();
    return db
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.status, 'proposed'));
  }

  async getDealEventsOrdered() {
    const db = getDb();
    return db
      .select()
      .from(schema.dealEvents)
      .orderBy(schema.dealEvents.createdAt);
  }

  async getHaulers() {
    const db = getDb();
    return db.select().from(schema.haulers);
  }

  async createHauler(values: { id: string; name: string; contact: string; serviceArea: string }) {
    const db = getDb();
    await db.insert(schema.haulers).values(values);
  }

  async getAuditLog() {
    const db = getDb();
    return db.select().from(schema.dealEvents);
  }

  async getBusinesses() {
    const db = getDb();
    return db
      .select({
        id: schema.businesses.id,
        businessName: schema.businesses.name,
        businessType: schema.businesses.type,
        email: schema.users.email,
      })
      .from(schema.businesses)
      .innerJoin(schema.users, eq(schema.businesses.userId, schema.users.id));
  }
}

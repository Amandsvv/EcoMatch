import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../db';

export class AdminRepository {
  async getUnconfirmedVerificationRecords() {
    const db = getDb();
    return db
      .select()
      .from(schema.verificationRecords)
      .where(eq(schema.verificationRecords.confirmed, false));
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
    return db.select().from(schema.businesses);
  }
}

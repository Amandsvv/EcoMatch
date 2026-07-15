import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../db';

export class BusinessesRepository {
  async getBusinessById(businessId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.id, businessId))
      .limit(1);
    return result[0] || null;
  }

  async updateBusiness(businessId: string, values: Partial<typeof schema.businesses.$inferInsert>) {
    const db = getDb();
    await db
      .update(schema.businesses)
      .set(values)
      .where(eq(schema.businesses.id, businessId));
  }
}

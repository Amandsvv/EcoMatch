import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../db';

export class AuthRepository {
  async getUserByEmail(email: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return result[0] || null;
  }

  async getBusinessByUserId(userId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.userId, userId))
      .limit(1);
    return result[0] || null;
  }

  async createUserAndBusiness(
    userData: { id: string; email: string; passwordHash: string; role: 'business' | 'admin' },
    businessData: {
      id: string;
      userId: string;
      name: string;
      type: string;
      address: string;
      lat: number;
      lng: number;
      phone: string;
    }
  ) {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.insert(schema.users).values(userData);
      await tx.insert(schema.businesses).values(businessData);
    });
  }
}

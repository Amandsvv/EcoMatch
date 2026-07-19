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

  async getUserByVerificationToken(token: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.emailVerificationToken, token))
      .limit(1);
    return result[0] || null;
  }

  async markEmailVerified(userId: string) {
    const db = getDb();
    await db
      .update(schema.users)
      .set({
        emailVerified: true,
      })
      .where(eq(schema.users.id, userId));
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
    userData: {
      id: string;
      email: string;
      passwordHash: string;
      role: 'business' | 'admin';
      emailVerified: boolean;
      emailVerificationToken?: string | null;
      emailVerificationExpiry?: Date | null;
    },
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

  async getUserById(userId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    return result[0] || null;
  }

  async deleteUser(userId: string) {
    const db = getDb();
    await db.delete(schema.users).where(eq(schema.users.id, userId));
  }
}


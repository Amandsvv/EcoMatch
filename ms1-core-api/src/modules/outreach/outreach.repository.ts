import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb, schema } from '../../db';

export class OutreachRepository {
  async getOutreachDraftById(outreachDraftId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.outreachDrafts)
      .where(eq(schema.outreachDrafts.id, outreachDraftId))
      .limit(1);
    return result[0] || null;
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

  async getOutreachDraftsByMatchId(matchId: string) {
    const db = getDb();
    return db
      .select()
      .from(schema.outreachDrafts)
      .where(eq(schema.outreachDrafts.matchId, matchId));
  }

  /**
   * Returns true if the given businessId belongs to the stub email user.
   * Used to auto-accept on behalf of stub Phase-1 target businesses.
   */
  async isStubBusiness(businessId: string, stubEmail: string): Promise<boolean> {
    const db = getDb();
    const result = await db
      .select({ businessId: schema.businesses.id })
      .from(schema.businesses)
      .innerJoin(schema.users, eq(schema.businesses.userId, schema.users.id))
      .where(and(
        eq(schema.businesses.id, businessId),
        eq(schema.users.email, stubEmail)
      ))
      .limit(1);
    return result.length > 0;
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

  async acceptDraftAndCheckDual(
    outreachDraftId: string,
    userId: string,
    matchId: string,
    acceptEvent: typeof schema.dealEvents.$inferInsert,
    shouldUpdateMatch: boolean,
    matchBothAcceptedEvent?: typeof schema.dealEvents.$inferInsert,
    stubAutoAcceptDraftId?: string | null,
    stubUserId?: string | null,
  ) {
    const db = getDb();
    await db.transaction(async (tx) => {
      // 1. Update the current draft to accepted
      await tx
        .update(schema.outreachDrafts)
        .set({
          status: 'accepted',
          respondedByUserId: userId,
          respondedAt: new Date(),
        })
        .where(eq(schema.outreachDrafts.id, outreachDraftId));

      // 2. Insert the accept event
      await tx.insert(schema.dealEvents).values(acceptEvent);

      // 3. Auto-accept the stub target's draft if needed
      if (stubAutoAcceptDraftId && stubUserId) {
        await tx
          .update(schema.outreachDrafts)
          .set({
            status: 'accepted',
            respondedByUserId: stubUserId,
            respondedAt: new Date(),
          })
          .where(eq(schema.outreachDrafts.id, stubAutoAcceptDraftId));

        // Insert a deal event for the stub auto-accept
        await tx.insert(schema.dealEvents).values({
          id: uuidv4(),
          matchId,
          eventType: 'target_accepted',
          actorId: stubUserId,
          description: 'target business accepted the proposal (auto-accepted for stub partner)',
        });
      }

      // 4. If both sides are now accepted, advance match + schedule logistics
      if (shouldUpdateMatch) {
        // Find or create default hauler
        const existingHaulers = await tx
          .select()
          .from(schema.haulers)
          .where(eq(schema.haulers.name, 'EcoMatch Logistics'))
          .limit(1);

        let haulerId: string;
        if (existingHaulers.length > 0) {
          haulerId = existingHaulers[0].id;
        } else {
          haulerId = uuidv4();
          await tx.insert(schema.haulers).values({
            id: haulerId,
            name: 'EcoMatch Logistics',
            contact: '+1-555-LOG-PICK',
            serviceArea: 'New York Metro Area',
          });
        }

        // Create logistics booking
        await tx.insert(schema.logisticsBookings).values({
          id: uuidv4(),
          matchId,
          haulerId,
          pickupDate: new Date().toISOString().split('T')[0],
          status: 'scheduled',
        });

        // Update match status to both_accepted
        await tx
          .update(schema.matches)
          .set({ status: 'both_accepted' })
          .where(eq(schema.matches.id, matchId));

        if (matchBothAcceptedEvent) {
          const updatedEvent = {
            ...matchBothAcceptedEvent,
            description: 'Both businesses have accepted the proposal. Hauler EcoMatch Logistics has been scheduled.',
          };
          await tx.insert(schema.dealEvents).values(updatedEvent);
        }
      }
    });
  }

  async rejectDraftAndMatch(
    outreachDraftId: string,
    userId: string,
    matchId: string,
    rejectEvent: typeof schema.dealEvents.$inferInsert
  ) {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx
        .update(schema.outreachDrafts)
        .set({
          status: 'rejected',
          respondedByUserId: userId,
          respondedAt: new Date(),
        })
        .where(eq(schema.outreachDrafts.id, outreachDraftId));

      await tx
        .update(schema.matches)
        .set({ status: 'rejected' })
        .where(eq(schema.matches.id, matchId));

      await tx.insert(schema.dealEvents).values(rejectEvent);
    });
  }
}

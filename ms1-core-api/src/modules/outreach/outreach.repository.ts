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

  async acceptDraftAndCheckDual(
    outreachDraftId: string,
    userId: string,
    matchId: string,
    acceptEvent: typeof schema.dealEvents.$inferInsert,
    shouldUpdateMatch: boolean,
    matchBothAcceptedEvent?: typeof schema.dealEvents.$inferInsert
  ) {
    const db = getDb();
    await db.transaction(async (tx) => {
      // 1. Update draft
      await tx
        .update(schema.outreachDrafts)
        .set({
          status: 'accepted',
          respondedByUserId: userId,
          respondedAt: new Date(),
        })
        .where(eq(schema.outreachDrafts.id, outreachDraftId));

      // 2. Insert accept event
      await tx.insert(schema.dealEvents).values(acceptEvent);

      // 3. If both accepted, update match, schedule logistics, and insert second event
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
          matchId: matchId,
          haulerId: haulerId,
          pickupDate: new Date().toISOString().split('T')[0],
          status: 'scheduled',
        });

        // Update match status to logistics_scheduled
        await tx
          .update(schema.matches)
          .set({ status: 'logistics_scheduled' })
          .where(eq(schema.matches.id, matchId));

        if (matchBothAcceptedEvent) {
          // Adjust description to reflect hauler scheduling
          const updatedEvent = {
            ...matchBothAcceptedEvent,
            description: 'Both businesses have accepted the proposal. Hauler EcoMatch Logistics has been scheduled.'
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
      // 1. Update draft
      await tx
        .update(schema.outreachDrafts)
        .set({
          status: 'rejected',
          respondedByUserId: userId,
          respondedAt: new Date(),
        })
        .where(eq(schema.outreachDrafts.id, outreachDraftId));

      // 2. Update match status
      await tx
        .update(schema.matches)
        .set({ status: 'rejected' })
        .where(eq(schema.matches.id, matchId));

      // 3. Insert deal event
      await tx.insert(schema.dealEvents).values(rejectEvent);
    });
  }
}

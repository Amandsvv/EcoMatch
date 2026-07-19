import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { getDb, closeDb, schema } from '../src/db';
import { eq } from 'drizzle-orm';

describe('EcoMatch Core API - Integration Tests', () => {
  let db: ReturnType<typeof getDb>;
  let sourceToken: string;
  let sourceBusinessId: string;

  let targetToken: string;
  let targetBusinessId: string;

  const testSuffix = Math.floor(Math.random() * 1000000);

  beforeAll(async () => {
    jest.setTimeout(30000);
    db = getDb();
    
    // Create source business user
    const sourceEmail = `generator-${testSuffix}@example.com`;
    const sourceSignup = await request(app)
      .post('/auth/signup')
      .send({
        email: sourceEmail,
        password: 'password123',
        businessName: 'Organic Waste Cafe',
        businessType: 'restaurant',
        address: '123 Broadway, New York, NY 10006',
        lat: 40.715,
        lng: -74.008,
        phone: '555-0101',
      });
    
    expect(sourceSignup.status).toBe(201);
    sourceToken = sourceSignup.body.token;
    sourceBusinessId = sourceSignup.body.businessId;

    // Create target business user (compost operations nearby)
    const targetEmail = `composter-${testSuffix}@example.com`;
    const targetSignup = await request(app)
      .post('/auth/signup')
      .send({
        email: targetEmail,
        password: 'password123',
        businessName: 'Nearby Compost Operations',
        businessType: 'farm',
        address: '456 Broadway, New York, NY 10006',
        lat: 40.716, // very close
        lng: -74.009,
        phone: '555-0202',
      });
    
    expect(targetSignup.status).toBe(201);
    targetToken = targetSignup.body.token;
    targetBusinessId = targetSignup.body.businessId;

    // Delete any existing mock target business to prevent key conflict
    await db.delete(schema.businesses).where(eq(schema.businesses.id, '00000000-0000-0000-0000-000000000001'));

    // Re-route the registered target business to the mock compost operations UUID
    await db
      .update(schema.businesses)
      .set({ id: '00000000-0000-0000-0000-000000000001' })
      .where(eq(schema.businesses.id, targetBusinessId));
    
    targetBusinessId = '00000000-0000-0000-0000-000000000001';
  });

  afterAll(async () => {
    // Cleanup databases
    try {
      if (db) {
        // Delete match first (cascades to dealEvents, outreachDrafts, certificates)
        await db.delete(schema.matches).where(eq(schema.matches.sourceBusinessId, sourceBusinessId));
        
        // Clean matching data created in test suffix
        await db.delete(schema.users).where(eq(schema.users.email, `generator-${testSuffix}@example.com`));
        await db.delete(schema.users).where(eq(schema.users.email, `composter-${testSuffix}@example.com`));
        await db.delete(schema.businesses).where(eq(schema.businesses.id, '00000000-0000-0000-0000-000000000001'));
      }
    } catch (err) {
      console.error('Test cleanup failed', err);
    }
    await closeDb();
  });

  describe('Rule 4.1: Hazard flag prevents match creation', () => {
    it('should not create a match when hazard_flag is true', async () => {
      // Submit hazardous material
      const res = await request(app)
        .post('/submissions')
        .set('Authorization', `Bearer ${sourceToken}`)
        .send({
          businessId: sourceBusinessId,
          rawDescription: '10 barrels of highly toxic industrial chemical waste',
          photoRefs: [],
          disposalCostPerUnit: 120,
          disposalFrequency: 'once',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('hazard_detected');
      expect(res.body.classification.hazardFlag).toBe(true);

      // Verify no match row was created for this submission
      const matches = await db
        .select()
        .from(schema.matches)
        .where(eq(schema.matches.submissionId, res.body.submissionId));
      expect(matches.length).toBe(0);
    });
  });

  describe('Rule 4.7: matchConfidence < 0.7 suppresses match', () => {
    it('should not create a match when matchConfidence < 0.7', async () => {
      // Submit something that returns low match confidence or has no candidate.
      // Since it's local integration and we want it to fail, we can submit a material type 
      // that isn't supported or doesn't match target types.
      const res = await request(app)
        .post('/submissions')
        .set('Authorization', `Bearer ${sourceToken}`)
        .send({
          businessId: sourceBusinessId,
          rawDescription: '500 old cotton textile offcuts', // textile type
          photoRefs: [],
          disposalCostPerUnit: 30,
          disposalFrequency: 'weekly',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('submitted');

      // Call findMatch manually
      const matchRes = await request(app)
        .post(`/submissions/${res.body.submissionId}/match`)
        .set('Authorization', `Bearer ${sourceToken}`);

      expect(matchRes.status).toBe(200);
      expect(matchRes.body.status).toBe('no_match_found');

      // Verify no match row created
      const matches = await db
        .select()
        .from(schema.matches)
        .where(eq(schema.matches.submissionId, res.body.submissionId));
      expect(matches.length).toBe(0);
    });
  });

  describe('Rule 4.8 & 4.2: Full Pipeline, Draft Acceptance, and Contact Privacy', () => {
    it('should complete full match pipeline, enforce draft privacy, and handle dual accept/reject', async () => {
      // 1. Submit matching material (organic spent grain matches farm composter)
      const res = await request(app)
        .post('/submissions')
        .set('Authorization', `Bearer ${sourceToken}`)
        .send({
          businessId: sourceBusinessId,
          rawDescription: '5 tons of spent grains and coffee grounds',
          photoRefs: ['grain.jpg'],
          disposalCostPerUnit: 50,
          disposalFrequency: 'weekly',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('submitted');

      // Find match manually
      const matchRes = await request(app)
        .post(`/submissions/${res.body.submissionId}/match`)
        .set('Authorization', `Bearer ${sourceToken}`);

      expect(matchRes.status).toBe(200);
      expect(matchRes.body.status).toBe('match_proposed');
      expect(matchRes.body.match).toBeDefined();
      expect(matchRes.body.match.id).toBeDefined();

      const matchId = matchRes.body.match.id;

      // Draft proposal manually
      const draftRes = await request(app)
        .post(`/matches/${matchId}/draft`)
        .set('Authorization', `Bearer ${sourceToken}`);

      expect(draftRes.status).toBe(200);
      expect(draftRes.body.status).toBe('proposal_drafted');

      // 2. Retrieve match details (Rule 4.2: No contact info exposed)
      const matchDetailsRes = await request(app)
        .get(`/matches/${matchId}`)
        .set('Authorization', `Bearer ${sourceToken}`);

      expect(matchDetailsRes.status).toBe(200);
      expect(matchDetailsRes.body.match).toBeDefined();
      expect(matchDetailsRes.body.outreachDrafts.length).toBe(2);

      // Verify target business contact details are NOT returned
      const matchRecord = matchDetailsRes.body.match;
      expect(matchRecord.sourceBusinessPhone).toBeUndefined();
      expect(matchRecord.targetBusinessPhone).toBeUndefined();
      expect(matchRecord.sourceBusinessAddress).toBeUndefined();
      expect(matchRecord.targetBusinessAddress).toBeUndefined();

      // Verify drafts do NOT contain contact details
      const sourceDraft = matchDetailsRes.body.outreachDrafts.find((d: any) => d.recipientRole === 'source');
      const targetDraft = matchDetailsRes.body.outreachDrafts.find((d: any) => d.recipientRole === 'target');

      expect(sourceDraft.draftMessage).not.toContain('555-0202');
      expect(targetDraft.draftMessage).not.toContain('555-0101');
      expect(sourceDraft.draftMessage).not.toContain('456 Broadway');
      expect(targetDraft.draftMessage).not.toContain('123 Broadway');

      // 3. Reject / Accept boundaries (Rule 4.8)
      // Admins or wrong businesses must not accept target's draft
      const wrongAccept = await request(app)
        .post(`/outreach/${targetDraft.id}/accept`)
        .set('Authorization', `Bearer ${sourceToken}`); // Source tries to accept target draft
      expect(wrongAccept.status).toBe(403);

      // Target accepts their draft
      const targetAccept = await request(app)
        .post(`/outreach/${targetDraft.id}/accept`)
        .set('Authorization', `Bearer ${targetToken}`);
      expect(targetAccept.status).toBe(200);

      // Verify match status is still proposed (not both accepted yet)
      let matchReload = await db
        .select()
        .from(schema.matches)
        .where(eq(schema.matches.id, matchId))
        .limit(1);
      expect(matchReload[0].status).toBe('proposed');

      // Source accepts their draft
      const sourceAccept = await request(app)
        .post(`/outreach/${sourceDraft.id}/accept`)
        .set('Authorization', `Bearer ${sourceToken}`);
      expect(sourceAccept.status).toBe(200);

      // Verify match status changed to both_accepted
      matchReload = await db
        .select()
        .from(schema.matches)
        .where(eq(schema.matches.id, matchId))
        .limit(1);
      expect(matchReload[0].status).toBe('both_accepted');

      // 4. Deal Events verify (Rule 4.4: Deal events written for every state change)
      const events = await db
        .select()
        .from(schema.dealEvents)
        .where(eq(schema.dealEvents.matchId, matchId));
      
      const eventTypes = events.map(e => e.eventType);
      expect(eventTypes).toContain('match_proposed');
      expect(eventTypes).toContain('target_accepted');
      expect(eventTypes).toContain('source_accepted');
      expect(eventTypes).toContain('both_accepted');

      // 5. Verification & Certificates (Rule 4.3: Certificate requires both verifications)
      // Source submits verification evidence
      const sourceVerSub = await request(app)
        .post(`/verification/${matchId}/submit`)
        .set('Authorization', `Bearer ${sourceToken}`)
        .send({ evidenceType: 'receipt' });
      expect(sourceVerSub.status).toBe(201);

      // Source confirms verification
      const sourceVerConf = await request(app)
        .post(`/verification/${matchId}/confirm`)
        .set('Authorization', `Bearer ${sourceToken}`)
        .send({ businessId: sourceBusinessId });
      expect(sourceVerConf.status).toBe(200);

      // Try to issue certificate when only one side is verified -> should fail
      const earlyCert = await request(app)
        .post(`/certificates/${matchId}/issue`)
        .set('Authorization', `Bearer ${sourceToken}`);
      expect(earlyCert.status).toBe(400);

      // Target submits verification evidence
      const targetVerSub = await request(app)
        .post(`/verification/${matchId}/submit`)
        .set('Authorization', `Bearer ${targetToken}`)
        .send({ evidenceType: 'photo' });
      expect(targetVerSub.status).toBe(201);

      // Target confirms verification
      const targetVerConf = await request(app)
        .post(`/verification/${matchId}/confirm`)
        .set('Authorization', `Bearer ${targetToken}`)
        .send({ businessId: targetBusinessId });
      expect(targetVerConf.status).toBe(200);

      // Issue certificate after both verified -> should succeed
      const issueCert = await request(app)
        .post(`/certificates/${matchId}/issue`)
        .set('Authorization', `Bearer ${sourceToken}`);
      
      expect(issueCert.status).toBe(201);
      expect(issueCert.body.co2eAvoidedKg).toBeGreaterThan(0);
      expect(issueCert.body.dollarsSaved).toBeGreaterThan(0);
      expect(issueCert.body.methodologyReference).toBeDefined();

      // Check match status is now verified
      matchReload = await db
        .select()
        .from(schema.matches)
        .where(eq(schema.matches.id, matchId))
        .limit(1);
      expect(matchReload[0].status).toBe('verified');
    }, 30000);
  });
});

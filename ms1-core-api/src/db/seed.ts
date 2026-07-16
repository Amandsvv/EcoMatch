import { getDb, schema } from './index';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const db = getDb();
  console.log('🌱 Starting database seeding...');

  const passwordHash = await bcrypt.hash('Demo1234!', 8);

  // 1. Mock Users
  const mockUsers = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'cafe@ecomatch.dev',
      passwordHash,
      role: 'business' as const,
      emailVerified: true,
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'brewery@ecomatch.dev',
      passwordHash,
      role: 'business' as const,
      emailVerified: true,
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      email: 'compost@ecomatch.dev',
      passwordHash,
      role: 'business' as const,
      emailVerified: true,
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      email: 'mushroom@ecomatch.dev',
      passwordHash,
      role: 'business' as const,
      emailVerified: true,
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      email: 'admin@ecomatch.dev',
      passwordHash,
      role: 'admin' as const,
      emailVerified: true,
    },
  ];

  // 2. Mock Businesses
  const mockBusinesses = [
    {
      id: '10000000-0000-0000-0000-000000000001',
      userId: '11111111-1111-1111-1111-111111111111',
      name: 'Green Cafe NYC',
      type: 'restaurant',
      address: '123 Broadway, New York, NY 10007',
      lat: 40.7128,
      lng: -74.0060,
      phone: '+1-212-555-0101',
    },
    {
      id: '20000000-0000-0000-0000-000000000002',
      userId: '22222222-2222-2222-2222-222222222222',
      name: 'Manhattan Brewery',
      type: 'brewery',
      address: '456 Eighth Ave, New York, NY 10001',
      lat: 40.7501,
      lng: -73.9933,
      phone: '+1-212-555-0202',
    },
    {
      id: '00000000-0000-0000-0000-000000000001', // Pre-aligned with Alchemist mock businesses
      userId: '33333333-3333-3333-3333-333333333333',
      name: 'Local Compost Operations',
      type: 'farm',
      address: '789 Compost Way, New York, NY 10006',
      lat: 40.7150,
      lng: -74.0080,
      phone: '+1-555-900-1111',
    },
    {
      id: '00000000-0000-0000-0000-000000000002', // Pre-aligned with Alchemist mock businesses
      userId: '44444444-4444-4444-4444-444444444444',
      name: 'Urban Mushroom Farm',
      type: 'farm',
      address: '456 Fungi Ave, New York, NY 10006',
      lat: 40.7200,
      lng: -74.0050,
      phone: '+1-555-900-2222',
    },
  ];

  // 3. Clean database in correct dependency order
  console.log(' Cleaning up old database records...');
  await db.delete(schema.dealEvents);
  await db.delete(schema.verificationRecords);
  await db.delete(schema.certificates);
  await db.delete(schema.logisticsBookings);
  await db.delete(schema.outreachDrafts);
  await db.delete(schema.matches);
  await db.delete(schema.materialClassifications);
  await db.delete(schema.submissions);
  await db.delete(schema.businesses);
  await db.delete(schema.users);

  console.log(' Inserting mock users...');
  for (const user of mockUsers) {
    await db.insert(schema.users).values(user);
  }

  console.log(' Inserting mock businesses...');
  for (const business of mockBusinesses) {
    await db.insert(schema.businesses).values(business);
  }

  // 4. Mock Submissions & Classifications
  // ─── Submission 1: Coffee Grounds (Accepted Match with Certificate) ───
  const sub1Id = uuidv4();
  await db.insert(schema.submissions).values({
    id: sub1Id,
    businessId: '10000000-0000-0000-0000-000000000001',
    rawDescription: 'Spent organic espresso grounds from daily coffee preparation. High nitrogen content, dry and ready for pickup.',
    disposalCostPerUnit: 40,
    disposalFrequency: 'weekly',
    status: 'submitted',
  });

  await db.insert(schema.materialClassifications).values({
    id: uuidv4(),
    submissionId: sub1Id,
    primaryCategory: 'organic_biomass',
    subtype: 'coffee_grounds',
    estimatedComposition: JSON.stringify({ nitrogen: 2.1, carbon: 45, moisture_pct: 60 }),
    confidence: 0.95,
    hazardFlag: false,
  });

  // ─── Submission 2: Spent Grain (Proposed Match pending decision) ───
  const sub2Id = uuidv4();
  await db.insert(schema.submissions).values({
    id: sub2Id,
    businessId: '20000000-0000-0000-0000-000000000002',
    rawDescription: 'Wet spent brewer grain from batch brewing (barley/wheat). Ideal for animal feed or mushroom compost.',
    disposalCostPerUnit: 120,
    disposalFrequency: 'monthly',
    status: 'submitted',
  });

  await db.insert(schema.materialClassifications).values({
    id: uuidv4(),
    submissionId: sub2Id,
    primaryCategory: 'organic_biomass',
    subtype: 'spent_grain',
    estimatedComposition: JSON.stringify({ moisture_pct: 75 }),
    confidence: 0.92,
    hazardFlag: false,
  });

  // 5. Matches, Deals, and Outreach
  // ─── Match 1: Cafe -> Compost (Completed, Accepted & Verified) ───
  const match1Id = uuidv4();
  await db.insert(schema.matches).values({
    id: match1Id,
    sourceBusinessId: '10000000-0000-0000-0000-000000000001',
    targetBusinessId: '00000000-0000-0000-0000-000000000001',
    submissionId: sub1Id,
    matchRationale: 'Spent coffee grounds possess high nitrogen and acidity, making them excellent composting additives to accelerate organic decomposition in farm soils.',
    matchConfidence: 0.92,
    distanceKm: 0.6,
    estimatedSourceSavings: 240,
    estimatedTargetSavingsPct: 45,
    status: 'verified', // Completed match
  });

  await db.insert(schema.dealEvents).values({
    id: uuidv4(),
    matchId: match1Id,
    eventType: 'match_proposed',
    actorId: '55555555-5555-5555-5555-555555555555',
    description: 'System automatically matched Cafe and Compost Operations.',
  });

  await db.insert(schema.outreachDrafts).values([
    {
      id: uuidv4(),
      matchId: match1Id,
      recipientRole: 'source',
      draftMessage: 'Hi Green Cafe NYC, we found a composting partner for your coffee grounds.',
      proposedTerms: JSON.stringify({ price_per_unit: 10, frequency: 'weekly', contract_length_months: 12 }),
      status: 'accepted',
      respondedByUserId: '11111111-1111-1111-1111-111111111111',
      respondedAt: new Date(),
    },
    {
      id: uuidv4(),
      matchId: match1Id,
      recipientRole: 'target',
      draftMessage: 'Hi Local Compost Operations, Green Cafe has organic coffee grounds ready for composting.',
      proposedTerms: JSON.stringify({ price_per_unit: 10, frequency: 'weekly', contract_length_months: 12 }),
      status: 'accepted',
      respondedByUserId: '33333333-3333-3333-3333-333333333333',
      respondedAt: new Date(),
    },
  ]);

  // Dual verification records showing confirmed status
  await db.insert(schema.verificationRecords).values([
    {
      id: uuidv4(),
      matchId: match1Id,
      businessId: '10000000-0000-0000-0000-000000000001',
      evidenceType: 'receipt',
      confirmed: true,
      confirmedAt: new Date(),
    },
    {
      id: uuidv4(),
      matchId: match1Id,
      businessId: '00000000-0000-0000-0000-000000000001',
      evidenceType: 'photo',
      confirmed: true,
      confirmedAt: new Date(),
    },
  ]);

  // Generate impact certificate for Match 1
  await db.insert(schema.certificates).values({
    id: uuidv4(),
    matchId: match1Id,
    co2eAvoidedKg: 340,
    dollarsSaved: 280,
    methodologyReference: 'EPA WARM V15: Avoided landfill methane emissions via organic composting diversion.',
  });


  // ─── Match 2: Brewery -> Mushroom Farm (Proposed, Pending response) ───
  const match2Id = uuidv4();
  await db.insert(schema.matches).values({
    id: match2Id,
    sourceBusinessId: '20000000-0000-0000-0000-000000000002',
    targetBusinessId: '00000000-0000-0000-0000-000000000002',
    submissionId: sub2Id,
    matchRationale: 'Spent brewer grain serves as an exceptional protein-rich growing substrate for gourmet oyster mushrooms, offering immediate reuse without processing.',
    matchConfidence: 0.88,
    distanceKm: 3.5,
    estimatedSourceSavings: 720,
    estimatedTargetSavingsPct: 60,
    status: 'proposed',
  });

  await db.insert(schema.outreachDrafts).values([
    {
      id: uuidv4(),
      matchId: match2Id,
      recipientRole: 'source',
      draftMessage: 'Hi Manhattan Brewery, we found a local farm interested in reusing your spent brewer grain.',
      proposedTerms: JSON.stringify({ price_per_unit: 15, frequency: 'monthly', contract_length_months: 6 }),
      status: 'pending',
    },
    {
      id: uuidv4(),
      matchId: match2Id,
      recipientRole: 'target',
      draftMessage: 'Hi Urban Mushroom Farm, Manhattan Brewery has protein-rich spent grain substrate available.',
      proposedTerms: JSON.stringify({ price_per_unit: 15, frequency: 'monthly', contract_length_months: 6 }),
      status: 'pending',
    },
  ]);

  console.log('✅ Seeding complete! Database is populated with beautiful demo data.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error seeding database:', err);
  process.exit(1);
});

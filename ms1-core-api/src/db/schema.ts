import {
  pgTable,
  uuid,
  varchar,
  text,
  doublePrecision as float,
  boolean,
  timestamp,
  jsonb,
  date,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['business', 'admin']);
export const matchStatusEnum = pgEnum('match_status', [
  'proposed',
  'rejected',
  'both_accepted',
  'logistics_scheduled',
  'completed',
  'verified',
]);
export const outreachDraftStatusEnum = pgEnum('outreach_draft_status', [
  'pending',
  'accepted',
  'rejected',
]);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('business'),
  emailVerified: boolean('email_verified').notNull().default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 255 }),
  emailVerificationExpiry: timestamp('email_verification_expiry'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Businesses table
export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  address: text('address').notNull(),
  lat: float('lat').notNull(),
  lng: float('lng').notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Submissions table
export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  rawDescription: text('raw_description').notNull(),
  photoRefs: text('photo_refs'), // JSON string of URLs
  disposalCostPerUnit: float('disposal_cost_per_unit').notNull(),
  disposalFrequency: varchar('disposal_frequency', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('submitted'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Material Classifications table
export const materialClassifications = pgTable('material_classifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id')
    .notNull()
    .references(() => submissions.id, { onDelete: 'cascade' }),
  primaryCategory: varchar('primary_category', { length: 255 }).notNull(),
  subtype: varchar('subtype', { length: 255 }),
  estimatedComposition: jsonb('estimated_composition'), // e.g., { nitrogen: 2.5, carbon: 45 }
  confidence: float('confidence').notNull(),
  hazardFlag: boolean('hazard_flag').notNull().default(false),
  followupQuestion: text('followup_question'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    hazardFlagIdx: index('hazard_flag_idx').on(table.hazardFlag),
  };
});

// Matches table
export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceBusinessId: uuid('source_business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  targetBusinessId: uuid('target_business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  submissionId: uuid('submission_id')
    .notNull()
    .references(() => submissions.id, { onDelete: 'cascade' }),
  matchRationale: text('match_rationale').notNull(),
  matchConfidence: float('match_confidence').notNull(),
  distanceKm: float('distance_km').notNull(),
  estimatedSourceSavings: float('estimated_source_savings'),
  estimatedTargetSavingsPct: float('estimated_target_savings_pct'),
  status: matchStatusEnum('status').notNull().default('proposed'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Outreach Drafts table
export const outreachDrafts = pgTable('outreach_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id')
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  recipientRole: varchar('recipient_role', { length: 50 }).notNull(), // 'source' or 'target'
  draftMessage: text('draft_message').notNull(),
  proposedTerms: jsonb('proposed_terms'), // e.g., { price_per_unit: 5.50, frequency: 'weekly', contract_length_months: 12 }
  status: outreachDraftStatusEnum('status').notNull().default('pending'),
  respondedByUserId: uuid('responded_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  respondedAt: timestamp('responded_at'),
  notifiedAt: timestamp('notified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Deal Events table
export const dealEvents = pgTable('deal_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id')
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 255 }).notNull(),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Verification Records table
export const verificationRecords = pgTable('verification_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id')
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  evidenceType: varchar('evidence_type', { length: 255 }).notNull(), // 'photo' or 'receipt'
  evidenceUrl: text('evidence_url'),
  confirmed: boolean('confirmed').notNull().default(false),
  confirmedAt: timestamp('confirmed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


// Certificates table
export const certificates = pgTable('certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id')
    .notNull()
    .unique()
    .references(() => matches.id, { onDelete: 'cascade' }),
  co2eAvoidedKg: float('co2e_avoided_kg').notNull(),
  dollarsSaved: float('dollars_saved').notNull(),
  methodologyReference: text('methodology_reference'),
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
});

// Haulers table
export const haulers = pgTable('haulers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  contact: varchar('contact', { length: 255 }).notNull(),
  serviceArea: text('service_area').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Logistics Bookings table
export const logisticsBookings = pgTable('logistics_bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id')
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  haulerId: uuid('hauler_id')
    .notNull()
    .references(() => haulers.id, { onDelete: 'restrict' }),
  pickupDate: date('pickup_date'),
  status: varchar('status', { length: 50 }).notNull().default('scheduled'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  business: one(businesses, { fields: [users.id], references: [businesses.userId] }),
  outreachDrafts: many(outreachDrafts),
  dealEvents: many(dealEvents),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  user: one(users, { fields: [businesses.userId], references: [users.id] }),
  submissions: many(submissions),
  sourceMatches: many(matches, { relationName: 'source' }),
  targetMatches: many(matches, { relationName: 'target' }),
  verificationRecords: many(verificationRecords),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  business: one(businesses, { fields: [submissions.businessId], references: [businesses.id] }),
  classification: one(materialClassifications),
  matches: many(matches),
}));

export const materialClassificationsRelations = relations(materialClassifications, ({ one }) => ({
  submission: one(submissions, { fields: [materialClassifications.submissionId], references: [submissions.id] }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  sourceBusiness: one(businesses, { fields: [matches.sourceBusinessId], references: [businesses.id], relationName: 'source' }),
  targetBusiness: one(businesses, { fields: [matches.targetBusinessId], references: [businesses.id], relationName: 'target' }),
  submission: one(submissions, { fields: [matches.submissionId], references: [submissions.id] }),
  outreachDrafts: many(outreachDrafts),
  dealEvents: many(dealEvents),
  verificationRecords: many(verificationRecords),
  certificate: one(certificates),
  logisticsBooking: one(logisticsBookings),
}));

export const outreachDraftsRelations = relations(outreachDrafts, ({ one }) => ({
  match: one(matches, { fields: [outreachDrafts.matchId], references: [matches.id] }),
  respondedByUser: one(users, { fields: [outreachDrafts.respondedByUserId], references: [users.id] }),
}));

export const dealEventsRelations = relations(dealEvents, ({ one }) => ({
  match: one(matches, { fields: [dealEvents.matchId], references: [matches.id] }),
  actor: one(users, { fields: [dealEvents.actorId], references: [users.id] }),
}));

export const verificationRecordsRelations = relations(verificationRecords, ({ one }) => ({
  match: one(matches, { fields: [verificationRecords.matchId], references: [matches.id] }),
  business: one(businesses, { fields: [verificationRecords.businessId], references: [businesses.id] }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  match: one(matches, { fields: [certificates.matchId], references: [matches.id] }),
}));

export const haulersRelations = relations(haulers, ({ many }) => ({
  logisticsBookings: many(logisticsBookings),
}));

export const logisticsBookingsRelations = relations(logisticsBookings, ({ one }) => ({
  match: one(matches, { fields: [logisticsBookings.matchId], references: [matches.id] }),
  hauler: one(haulers, { fields: [logisticsBookings.haulerId], references: [haulers.id] }),
}));

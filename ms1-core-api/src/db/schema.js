"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logisticsBookingsRelations = exports.haulersRelations = exports.certificatesRelations = exports.verificationRecordsRelations = exports.dealEventsRelations = exports.outreachDraftsRelations = exports.matchesRelations = exports.materialClassificationsRelations = exports.submissionsRelations = exports.businessesRelations = exports.usersRelations = exports.logisticsBookings = exports.haulers = exports.certificates = exports.verificationRecords = exports.dealEvents = exports.outreachDrafts = exports.matches = exports.materialClassifications = exports.submissions = exports.businesses = exports.users = exports.outreachDraftStatusEnum = exports.matchStatusEnum = exports.userRoleEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var drizzle_orm_1 = require("drizzle-orm");
// Enums
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', ['business', 'admin']);
exports.matchStatusEnum = (0, pg_core_1.pgEnum)('match_status', [
    'proposed',
    'rejected',
    'both_accepted',
    'logistics_scheduled',
    'completed',
    'verified',
]);
exports.outreachDraftStatusEnum = (0, pg_core_1.pgEnum)('outreach_draft_status', [
    'pending',
    'accepted',
    'rejected',
]);
// Users table
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    passwordHash: (0, pg_core_1.varchar)('password_hash', { length: 255 }).notNull(),
    role: (0, exports.userRoleEnum)('role').notNull().default('business'),
    emailVerified: (0, pg_core_1.boolean)('email_verified').notNull().default(false),
    emailVerificationToken: (0, pg_core_1.varchar)('email_verification_token', { length: 255 }),
    emailVerificationExpiry: (0, pg_core_1.timestamp)('email_verification_expiry'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Businesses table
exports.businesses = (0, pg_core_1.pgTable)('businesses', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 255 }).notNull(),
    address: (0, pg_core_1.text)('address').notNull(),
    lat: (0, pg_core_1.doublePrecision)('lat').notNull(),
    lng: (0, pg_core_1.doublePrecision)('lng').notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Submissions table
exports.submissions = (0, pg_core_1.pgTable)('submissions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    businessId: (0, pg_core_1.uuid)('business_id')
        .notNull()
        .references(function () { return exports.businesses.id; }, { onDelete: 'cascade' }),
    rawDescription: (0, pg_core_1.text)('raw_description').notNull(),
    photoRefs: (0, pg_core_1.text)('photo_refs'), // JSON string of URLs
    disposalCostPerUnit: (0, pg_core_1.doublePrecision)('disposal_cost_per_unit').notNull(),
    disposalFrequency: (0, pg_core_1.varchar)('disposal_frequency', { length: 50 }).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).notNull().default('submitted'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Material Classifications table
exports.materialClassifications = (0, pg_core_1.pgTable)('material_classifications', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    submissionId: (0, pg_core_1.uuid)('submission_id')
        .notNull()
        .references(function () { return exports.submissions.id; }, { onDelete: 'cascade' }),
    primaryCategory: (0, pg_core_1.varchar)('primary_category', { length: 255 }).notNull(),
    subtype: (0, pg_core_1.varchar)('subtype', { length: 255 }),
    estimatedComposition: (0, pg_core_1.jsonb)('estimated_composition'), // e.g., { nitrogen: 2.5, carbon: 45 }
    confidence: (0, pg_core_1.doublePrecision)('confidence').notNull(),
    hazardFlag: (0, pg_core_1.boolean)('hazard_flag').notNull().default(false),
    followupQuestion: (0, pg_core_1.text)('followup_question'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, function (table) {
    return {
        hazardFlagIdx: (0, pg_core_1.index)('hazard_flag_idx').on(table.hazardFlag),
    };
});
// Matches table
exports.matches = (0, pg_core_1.pgTable)('matches', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    sourceBusinessId: (0, pg_core_1.uuid)('source_business_id')
        .notNull()
        .references(function () { return exports.businesses.id; }, { onDelete: 'cascade' }),
    targetBusinessId: (0, pg_core_1.uuid)('target_business_id')
        .notNull()
        .references(function () { return exports.businesses.id; }, { onDelete: 'cascade' }),
    submissionId: (0, pg_core_1.uuid)('submission_id')
        .notNull()
        .references(function () { return exports.submissions.id; }, { onDelete: 'cascade' }),
    matchRationale: (0, pg_core_1.text)('match_rationale').notNull(),
    matchConfidence: (0, pg_core_1.doublePrecision)('match_confidence').notNull(),
    distanceKm: (0, pg_core_1.doublePrecision)('distance_km').notNull(),
    estimatedSourceSavings: (0, pg_core_1.doublePrecision)('estimated_source_savings'),
    estimatedTargetSavingsPct: (0, pg_core_1.doublePrecision)('estimated_target_savings_pct'),
    status: (0, exports.matchStatusEnum)('status').notNull().default('proposed'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Outreach Drafts table
exports.outreachDrafts = (0, pg_core_1.pgTable)('outreach_drafts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    matchId: (0, pg_core_1.uuid)('match_id')
        .notNull()
        .references(function () { return exports.matches.id; }, { onDelete: 'cascade' }),
    recipientRole: (0, pg_core_1.varchar)('recipient_role', { length: 50 }).notNull(), // 'source' or 'target'
    draftMessage: (0, pg_core_1.text)('draft_message').notNull(),
    proposedTerms: (0, pg_core_1.jsonb)('proposed_terms'), // e.g., { price_per_unit: 5.50, frequency: 'weekly', contract_length_months: 12 }
    status: (0, exports.outreachDraftStatusEnum)('status').notNull().default('pending'),
    respondedByUserId: (0, pg_core_1.uuid)('responded_by_user_id').references(function () { return exports.users.id; }, { onDelete: 'set null' }),
    respondedAt: (0, pg_core_1.timestamp)('responded_at'),
    notifiedAt: (0, pg_core_1.timestamp)('notified_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Deal Events table
exports.dealEvents = (0, pg_core_1.pgTable)('deal_events', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    matchId: (0, pg_core_1.uuid)('match_id')
        .notNull()
        .references(function () { return exports.matches.id; }, { onDelete: 'cascade' }),
    eventType: (0, pg_core_1.varchar)('event_type', { length: 255 }).notNull(),
    actorId: (0, pg_core_1.uuid)('actor_id')
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    description: (0, pg_core_1.text)('description').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Verification Records table
exports.verificationRecords = (0, pg_core_1.pgTable)('verification_records', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    matchId: (0, pg_core_1.uuid)('match_id')
        .notNull()
        .references(function () { return exports.matches.id; }, { onDelete: 'cascade' }),
    businessId: (0, pg_core_1.uuid)('business_id')
        .notNull()
        .references(function () { return exports.businesses.id; }, { onDelete: 'cascade' }),
    evidenceType: (0, pg_core_1.varchar)('evidence_type', { length: 255 }).notNull(), // 'photo' or 'receipt'
    evidenceUrl: (0, pg_core_1.text)('evidence_url'),
    confirmed: (0, pg_core_1.boolean)('confirmed').notNull().default(false),
    confirmedAt: (0, pg_core_1.timestamp)('confirmed_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Certificates table
exports.certificates = (0, pg_core_1.pgTable)('certificates', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    matchId: (0, pg_core_1.uuid)('match_id')
        .notNull()
        .unique()
        .references(function () { return exports.matches.id; }, { onDelete: 'cascade' }),
    co2eAvoidedKg: (0, pg_core_1.doublePrecision)('co2e_avoided_kg').notNull(),
    dollarsSaved: (0, pg_core_1.doublePrecision)('dollars_saved').notNull(),
    methodologyReference: (0, pg_core_1.text)('methodology_reference'),
    issuedAt: (0, pg_core_1.timestamp)('issued_at').defaultNow().notNull(),
});
// Haulers table
exports.haulers = (0, pg_core_1.pgTable)('haulers', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    contact: (0, pg_core_1.varchar)('contact', { length: 255 }).notNull(),
    serviceArea: (0, pg_core_1.text)('service_area').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Logistics Bookings table
exports.logisticsBookings = (0, pg_core_1.pgTable)('logistics_bookings', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    matchId: (0, pg_core_1.uuid)('match_id')
        .notNull()
        .references(function () { return exports.matches.id; }, { onDelete: 'cascade' }),
    haulerId: (0, pg_core_1.uuid)('hauler_id')
        .notNull()
        .references(function () { return exports.haulers.id; }, { onDelete: 'restrict' }),
    pickupDate: (0, pg_core_1.date)('pickup_date'),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).notNull().default('scheduled'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Relations
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        business: one(exports.businesses, { fields: [exports.users.id], references: [exports.businesses.userId] }),
        outreachDrafts: many(exports.outreachDrafts),
        dealEvents: many(exports.dealEvents),
    });
});
exports.businessesRelations = (0, drizzle_orm_1.relations)(exports.businesses, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        user: one(exports.users, { fields: [exports.businesses.userId], references: [exports.users.id] }),
        submissions: many(exports.submissions),
        sourceMatches: many(exports.matches, { relationName: 'source' }),
        targetMatches: many(exports.matches, { relationName: 'target' }),
        verificationRecords: many(exports.verificationRecords),
    });
});
exports.submissionsRelations = (0, drizzle_orm_1.relations)(exports.submissions, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        business: one(exports.businesses, { fields: [exports.submissions.businessId], references: [exports.businesses.id] }),
        classification: one(exports.materialClassifications),
        matches: many(exports.matches),
    });
});
exports.materialClassificationsRelations = (0, drizzle_orm_1.relations)(exports.materialClassifications, function (_a) {
    var one = _a.one;
    return ({
        submission: one(exports.submissions, { fields: [exports.materialClassifications.submissionId], references: [exports.submissions.id] }),
    });
});
exports.matchesRelations = (0, drizzle_orm_1.relations)(exports.matches, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        sourceBusiness: one(exports.businesses, { fields: [exports.matches.sourceBusinessId], references: [exports.businesses.id], relationName: 'source' }),
        targetBusiness: one(exports.businesses, { fields: [exports.matches.targetBusinessId], references: [exports.businesses.id], relationName: 'target' }),
        submission: one(exports.submissions, { fields: [exports.matches.submissionId], references: [exports.submissions.id] }),
        outreachDrafts: many(exports.outreachDrafts),
        dealEvents: many(exports.dealEvents),
        verificationRecords: many(exports.verificationRecords),
        certificate: one(exports.certificates),
        logisticsBooking: one(exports.logisticsBookings),
    });
});
exports.outreachDraftsRelations = (0, drizzle_orm_1.relations)(exports.outreachDrafts, function (_a) {
    var one = _a.one;
    return ({
        match: one(exports.matches, { fields: [exports.outreachDrafts.matchId], references: [exports.matches.id] }),
        respondedByUser: one(exports.users, { fields: [exports.outreachDrafts.respondedByUserId], references: [exports.users.id] }),
    });
});
exports.dealEventsRelations = (0, drizzle_orm_1.relations)(exports.dealEvents, function (_a) {
    var one = _a.one;
    return ({
        match: one(exports.matches, { fields: [exports.dealEvents.matchId], references: [exports.matches.id] }),
        actor: one(exports.users, { fields: [exports.dealEvents.actorId], references: [exports.users.id] }),
    });
});
exports.verificationRecordsRelations = (0, drizzle_orm_1.relations)(exports.verificationRecords, function (_a) {
    var one = _a.one;
    return ({
        match: one(exports.matches, { fields: [exports.verificationRecords.matchId], references: [exports.matches.id] }),
        business: one(exports.businesses, { fields: [exports.verificationRecords.businessId], references: [exports.businesses.id] }),
    });
});
exports.certificatesRelations = (0, drizzle_orm_1.relations)(exports.certificates, function (_a) {
    var one = _a.one;
    return ({
        match: one(exports.matches, { fields: [exports.certificates.matchId], references: [exports.matches.id] }),
    });
});
exports.haulersRelations = (0, drizzle_orm_1.relations)(exports.haulers, function (_a) {
    var many = _a.many;
    return ({
        logisticsBookings: many(exports.logisticsBookings),
    });
});
exports.logisticsBookingsRelations = (0, drizzle_orm_1.relations)(exports.logisticsBookings, function (_a) {
    var one = _a.one;
    return ({
        match: one(exports.matches, { fields: [exports.logisticsBookings.matchId], references: [exports.matches.id] }),
        hauler: one(exports.haulers, { fields: [exports.logisticsBookings.haulerId], references: [exports.haulers.id] }),
    });
});

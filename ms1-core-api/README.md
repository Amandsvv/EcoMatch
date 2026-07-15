# ms1-core-api — Express Core API

EcoMatch's central backend service for authentication, business/submission CRUD, match/deal state machine, and admin console.

## Phase 1a Scope

- ✅ Auth (signup/login, JWT, role = business|admin)
- ✅ CRUD: businesses, submissions
- ✅ Submission pipeline: classify → hazard check → match → draft → notify
- ✅ Accept/reject flow (single human checkpoint: each business accepts its own proposal)
- ✅ Deal events logging (every state change, same transaction)
- ✅ Verification + certificate issuance
- ✅ Admin console endpoints (supervisory, non-blocking)
- ❌ Real AWS SES (stub only)
- ❌ Real hauler assignment (stub only)

## Tech Stack

- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT
- **Logging**: Winston (structured JSON)
- **HTTP Client**: axios (to MS2)

## Local Development

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- PostgreSQL 15+ (or use Docker)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start PostgreSQL (docker-compose):**
   ```bash
   docker-compose up -d postgres
   ```

3. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

4. **Start dev server:**
   ```bash
   npm run dev
   ```

Server will start on `http://localhost:4000`.

### Database Commands

- **Migrate**: `npm run db:migrate`
- **Push schema**: `npm run db:push`
- **Studio** (GUI): `npm run db:studio`

## API Endpoints

### Auth
- `POST /auth/signup` — Create business account + user
- `POST /auth/login` — Login and get JWT

### Businesses
- `GET /businesses/:businessId` — Get business profile
- `PUT /businesses/:businessId` — Update business

### Submissions
- `POST /submissions` — Submit surplus material
- `GET /submissions/:submissionId` — Get submission details

### Outreach
- `POST /outreach/:outreachDraftId/accept` — Accept proposal (business only)
- `POST /outreach/:outreachDraftId/reject` — Reject proposal (business only)

### Verification
- `POST /verification/:matchId/submit` — Submit verification evidence
- `POST /verification/:matchId/confirm` — Confirm verification (business or admin)
- `GET /verification/:matchId` — Get verification records

### Certificates
- `POST /certificates/:matchId/issue` — Issue certificate (after both verified)
- `GET /certificates/:certificateId` — Get certificate details

### Matches
- `GET /matches/business/:businessId` — Get all matches for a business
- `GET /matches/:matchId` — Get match details + drafts + events

### Admin
- `GET /admin/queue/verifications` — Verification queue (admin only)
- `GET /admin/monitoring/low-confidence` — Low confidence matches
- `GET /admin/monitoring/events` — Deal events audit log
- `GET /admin/haulers` — List haulers
- `POST /admin/haulers` — Add hauler
- `GET /admin/audit/log` — Full audit log

## Database Schema

See `schema.md` for the full ERD and entity descriptions. Key tables:

- **users** — Login + role (business|admin)
- **businesses** — Company profile (name, type, location, contact)
- **submissions** — Surplus material reports
- **material_classifications** — Scout Agent output (category, hazard_flag, confidence)
- **matches** — AI-proposed pairings (source ↔ target business)
- **outreach_drafts** — In-platform proposals (one per side, status: pending|accepted|rejected)
- **deal_events** — Audit log (every state change)
- **verification_records** — Proof of reuse (one per business per match)
- **certificates** — Final CO2e + savings output
- **haulers** — Curated pickup/transport providers
- **logistics_bookings** — Pickup scheduling

## Non-Negotiable Rules (rules.md §4)

1. ✅ `hazard_flag = true` → no match row
2. ✅ `match_confidence < 0.7` → no match row (suppressed)
3. ✅ Only business user can accept/reject their own side
4. ✅ No contact info (`phone`/`address`) between businesses at any stage
5. ✅ Certificate requires both verifications confirmed
6. ✅ Every state change writes a deal_event in same transaction
7. ✅ All errors return structured `{ error, code, message }` response
8. ✅ MS2 failures surface as "AI service unavailable," not generic 500

## Testing

Run integration tests:
```bash
npm test
```

Tests verify all rules from `rules.md` §4 are enforced at the data/service layer, not just the UI.

## Logging

All requests, MS2 calls, state changes, and accept/reject actions are logged in JSON format with:
- `traceId` — unique per request, propagated to MS2
- `userId` — who performed the action
- `timestamp` — when it happened
- Context-specific fields (e.g., `matchId`, `confidence`, `hazardFlag`)

Logs go to:
- `console` — development
- `logs/error.log` — errors only
- `logs/combined.log` — everything

## Environment Variables

See `.env.example`. Key ones:

```
DATABASE_URL=postgresql://ecomatch:ecomatch@localhost:5432/ecomatch
JWT_SECRET=dev-secret-key-change-in-production
MS2_BASE_URL=http://localhost:8000
PORT=4000
NODE_ENV=development
```

## Phase 1a Exit Checklist

- [ ] `docker compose up` boots postgres + ms1 on :4000
- [ ] Migrations run clean
- [ ] One submission flows end-to-end:
  - [ ] Classified (hazard check passes)
  - [ ] Matched (confidence >= 0.7)
  - [ ] Both businesses notified
  - [ ] Both independently accept (via `/outreach/:id/accept`)
  - [ ] Reach `both_accepted` state
  - [ ] Both submit verification
  - [ ] Certificate issued
- [ ] All 8 rules in `rules.md` §4 have passing automated tests
- [ ] Error responses are always structured with `error`, `code`, `message`
- [ ] MS2 unavailability is handled gracefully (not a 500, surfaces as "service unavailable")

## Next Phase: 1b — Local Integration

Once this passes local Definition of Done:
- Real inter-service calls between ms1 and ms2
- Full local stack boots with one `docker compose up` from repo root
- Integration tests verify end-to-end behavior across all three services

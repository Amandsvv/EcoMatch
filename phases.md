# EcoMatch — Phases

**See also:** `PRD.md` (features/users) · `architecture.md` (system design) · `schema.md` (data model) · `rules.md` (build constraints)

Each phase has a goal, what's in scope, what's explicitly out, and an exit checklist. Do not start a phase's work before the previous phase's exit checklist is fully met.

> **v2 note:** All references to an operator approval/send step have been replaced with the business accept/reject flow and the admin supervisory role. See `PRD.md`, `architecture.md`, `agents.md`, and `rules.md` for the underlying change.

---

## Phase 1a — Local Service Build (complete)

**Goal:** each of the three services (ms1, ms2, frontend) works correctly on its own, locally, in isolation.

**In scope:**
- ms1: auth (role = `business` | `admin`), business/submission CRUD, match/deal state machine driven by business accept/reject, `deal_events` logging, admin console API (verification queue, fraud/quality monitoring, hauler management, dispute review, audit views), all wired against a local Postgres via docker-compose — no real AWS
- ms2: `/classify`, `/match`, `/draft`, `/verify` endpoints, each returning valid structured output against sample payloads, including correct suppression behavior for `matchConfidence < 0.7` — no real LLM cost optimization yet, correctness over efficiency
- frontend: all 19 Phase 1 screens per the Figma file, wired to ms1, using mocked/stub responses wherever ms1 or ms2 isn't ready yet — includes the Match Review (Accept/Reject) screen and the Admin Console

**Out of scope:** AWS, CI/CD, NGINX, real SES sends, production Docker images, cross-service integration testing, any in-app counter-offer or chat mechanism.

**Exit checklist:**
- [x] `docker compose up` in each service's own folder boots that service cleanly
- [x] Each service independently meets its Definition of Done (see local setup prompts)
- [x] No service depends on another actually running to pass its own local tests (mocks are fine)

---

## Phase 1b — Local Integration (complete)

**Goal:** all three services work correctly *together*, locally.

**In scope:**
- Full local stack: `docker compose up` from repo root boots Postgres + ms1 + ms2 + frontend together
- Real (non-mocked) calls: ms1 → ms2 for classify/match/draft/verify
- A submission flows start-to-finish through the real pipeline: submit → classify → hazard check → match (suppressed below 0.7) → both businesses notified → each independently accepts/rejects their own proposal → both-accepted → logistics scheduled (stubbed hauler, not actually emailed) → verification → certificate
- Every rule in `rules.md` §4 has a passing automated test against the real integrated stack, not just a unit test in isolation

**Out of scope:** AWS deployment, real SES sends, CI/CD pipelines, NGINX/HTTPS, counter-offer negotiation.

**Exit checklist:**
- [x] One command boots the entire local stack
- [x] A hazardous submission provably never reaches a `match` row (integration test, not manual check)
- [x] A match with `matchConfidence < 0.7` provably never produces a persisted `matches` row and is never shown to either business (integration test, not manual check)
- [x] A full submission-to-certificate flow completes locally with real inter-service calls
- [x] A match cannot reach `both_accepted` unless each business's own logged-in user independently accepted their own `outreach_draft` row — tested, not assumed; no admin can accept on a business's behalf
- [x] No ms1 endpoint ever returns the counterpart business's `phone`/`address` to the other business — tested, not assumed

---

## Phase 1c — Production Infrastructure (current phase)

**Goal:** the Phase 1b stack runs in a real, reachable, secure environment.

**In scope:**
- Docker production images (separate from local dev images) for all three services
- AWS EC2 deployment with HTTPS via certbot
- NGINX reverse proxy in front of frontend/ms1/ms2
- Real AWS SES integration — notification nudges actually send (login prompt only, no deal content or contact info in the email itself)
- GitHub Actions CI/CD, path-filtered per service (lint, test, build, deploy on change)
- OpenTelemetry wired end-to-end, traces visible in a real backend (Jaeger/SigNoz/Grafana)
- Real geocoding via OpenCage (not mocked coordinates)

**Out of scope:** multi-region support, live hauler API, e-signature, counter-offer negotiation.

**Exit checklist:**
- [ ] The app is reachable over HTTPS at a real domain
- [ ] A real notification email successfully sends (login prompt only, no deal content) and is logged correctly
- [ ] CI blocks a merge if any `rules.md` §4 test fails
- [ ] A trace for one full submission-to-certificate flow is visible end-to-end in the observability backend

---

## Phase 1 — Private Pilot

**Goal:** real businesses, in one geographic cluster, using the real thing.

**In scope:**
- Onboard one eco-industrial park or SME cluster (10–50 real businesses)
- Real submissions, real match proposals, each business independently accepting or rejecting its own side — admin supervises (verification, fraud/quality monitoring, disputes) but does not gate the flow
- Curated hauler list (2–3 local providers), manual logistics coordination once both sides accept
- 30-day verification follow-up before any certificate issues
- One measurable case study: total disposal-fee savings + CO2e avoided for the pilot cluster
- First real calibration data for the Scout follow-up threshold and the Alchemist 0.7 confidence floor (`agents.md` §7) — since there's no operator backstop anymore, this calibration matters more than it would have under the old design

**Out of scope:** everything in Phase 2 below.

**Exit checklist:**
- [ ] At least one match has gone all the way from submission to issued certificate with a real business on both sides, entirely via business accept/reject with no operator send step
- [ ] A cluster-manager-readable savings + CO2e report exists and is accurate
- [ ] No `rules.md` §4 rule has been violated in production, checked against real audit logs
- [ ] No instance of either business receiving the other's contact info outside the hauler-mediated logistics step, checked against real audit logs

---

## Phase 2 — Multi-Cluster Expansion

**Goal:** scale beyond one pilot cluster toward the PRD's 1,000+ business target.

**In scope (see `PRD.md` §6.3 for the feature list):**
- Multi-region support with region-specific hazardous-category rules
- Confidentiality-preserving match previews (abstracted material/process description before full detail is shared) — note this is about *material and process* detail, not contact info, since contact info is never revealed in any phase (`rules.md` §4.2)
- Live hauler API integration (replacing the curated list)
- Structured in-app counter-offer negotiation, replacing Accept/Reject-only (`architecture.md` §7) — lets a business propose different terms instead of only reject-and-rematch
- Trust-tiered autonomy for confidence-floor tuning or streamlined logistics steps for repeat, verified business pairs — this **never** extends to skipping either business's own acceptance or to revealing contact info between businesses; both of those stay permanent, in this phase and every later one (`PRD.md` §6.3, `rules.md` §4.2, §4.8)
- Cluster-level aggregate reporting for municipal/ESG buyers
- E-signature integration, still gated on both-sided acceptance

**Exit checklist:** defined once Phase 1 pilot data exists — do not pre-plan Phase 2 metrics before real pilot numbers are in hand.

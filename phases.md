# EcoMatch — Phases

**See also:** `PRD.md` (features/users) · `architecture.md` (system design) · `schema.md` (data model) · `rules.md` (build constraints)

Each phase has a goal, what's in scope, what's explicitly out, and an exit checklist. Do not start a phase's work before the previous phase's exit checklist is fully met.

---

## Phase 1a — Local Service Build (current phase)

**Goal:** each of the three services (ms1, ms2, frontend) works correctly on its own, locally, in isolation.

**In scope:**
- ms1: auth, business/submission CRUD, match/deal state machine, draft-only outreach, `deal_events` logging, all wired against a local Postgres via docker-compose — no real AWS
- ms2: `/classify`, `/match`, `/draft`, `/verify` endpoints, each returning valid structured output against sample payloads — no real LLM cost optimization yet, correctness over efficiency
- frontend: all 19 Phase 1 screens per the Figma file, wired to ms1, using mocked/stub responses wherever ms1 or ms2 isn't ready yet

**Out of scope:** AWS, CI/CD, NGINX, real SES sends, production Docker images, cross-service integration testing.

**Exit checklist:**
- [ ] `docker compose up` in each service's own folder boots that service cleanly
- [ ] Each service independently meets its Definition of Done (see local setup prompts)
- [ ] No service depends on another actually running to pass its own local tests (mocks are fine)

---

## Phase 1b — Local Integration

**Goal:** all three services work correctly *together*, locally.

**In scope:**
- Full local stack: `docker compose up` from repo root boots Postgres + ms1 + ms2 + frontend together
- Real (non-mocked) calls: ms1 → ms2 for classify/match/draft/verify
- A submission flows start-to-finish through the real pipeline: submit → classify → match → operator review → draft → operator send (stubbed SES, logged not actually emailed) → deal_events populated → verification → certificate
- Every rule in `rules.md` §4 has a passing automated test against the real integrated stack, not just a unit test in isolation

**Out of scope:** AWS deployment, real SES sends, CI/CD pipelines, NGINX/HTTPS.

**Exit checklist:**
- [ ] One command boots the entire local stack
- [ ] A hazardous submission provably never reaches a `match` row (integration test, not manual check)
- [ ] A full submission-to-certificate flow completes locally with real inter-service calls
- [ ] Outreach cannot be sent without both `human_approved=true` and an operator ID — tested, not assumed

---

## Phase 1c — Production Infrastructure

**Goal:** the Phase 1b stack runs in a real, reachable, secure environment.

**In scope:**
- Docker production images (separate from local dev images) for all three services
- AWS EC2 deployment with HTTPS via certbot
- NGINX reverse proxy in front of frontend/ms1/ms2
- Real AWS SES integration — outreach actually sends
- GitHub Actions CI/CD, path-filtered per service (lint, test, build, deploy on change)
- OpenTelemetry wired end-to-end, traces visible in a real backend (Jaeger/SigNoz/Grafana)
- Real geocoding via OpenCage (not mocked coordinates)

**Out of scope:** multi-region support, live hauler API, e-signature.

**Exit checklist:**
- [ ] The app is reachable over HTTPS at a real domain
- [ ] A real outreach email successfully sends and is logged correctly
- [ ] CI blocks a merge if any `rules.md` §4 test fails
- [ ] A trace for one full submission-to-certificate flow is visible end-to-end in the observability backend

---

## Phase 1 — Private Pilot

**Goal:** real businesses, in one geographic cluster, using the real thing.

**In scope:**
- Onboard one eco-industrial park or SME cluster (10–50 real businesses)
- Real submissions, real operator review, real outreach sent to real business contacts
- Curated hauler list (2–3 local providers), manual logistics coordination
- 30-day verification follow-up before any certificate issues
- One measurable case study: total disposal-fee savings + CO2e avoided for the pilot cluster

**Out of scope:** everything in Phase 2 below.

**Exit checklist:**
- [ ] At least one match has gone all the way from submission to issued certificate with a real business on both sides
- [ ] A CHRO/cluster-manager-readable savings + CO2e report exists and is accurate
- [ ] No `rules.md` §4 rule has been violated in production, checked against real audit logs

---

## Phase 2 — Multi-Cluster Expansion

**Goal:** scale beyond one pilot cluster toward the PRD's 1,000+ business target.

**In scope (see `PRD.md` §6.3 for the feature list):**
- Multi-region support with region-specific hazardous-category rules
- Confidentiality-preserving match previews (abstracted material description before full disclosure — this directly addresses the documented #1 barrier to industrial symbiosis platform adoption: reluctance to disclose proprietary process data)
- Live hauler API integration (replacing the curated list)
- Trust-tiered progressive autonomy: repeat, verified business pairs may skip full manual match review within pre-approved bounds — **outreach sending stays manual for all first-contact pairs, permanently, even in this phase**
- Cluster-level aggregate reporting for municipal/ESG buyers
- E-signature integration, still gated on human approval

**Exit checklist:** defined once Phase 1 pilot data exists — do not pre-plan Phase 2 metrics before real pilot numbers are in hand.

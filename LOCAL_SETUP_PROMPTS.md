# EcoMatch — Local Setup Prompts (Phase 1a)

Three self-contained prompts, one per service. This file is the execution
plan referenced by `prompt.txt` (the master entry point) — read that first.
Each prompt below points to specific sections of `PRD.md`, `architecture.md`,
`schema.md`, `agents.md`, `rules.md`, and `phases.md` rather than repeating
their content.

Scope is **local dev only** — no AWS, no CI, no NGINX, no production
concerns. Production build is a separate, later prompt set (Phase 1c,
see `phases.md`).

Run these in parallel across three agents/sessions. They only need to
agree on one contract: **ms1 port 4000, ms2 port 8000, frontend port
3000, frontend and ms1 only ever talk to each other.**

---

## Prompt 1 — ms1-core-api

```
Build ms1-core-api locally. Phase 1a, dev-only — no AWS, CI, or NGINX.

Stack: Express + TypeScript + Drizzle ORM + PostgreSQL + Winston.

Read first:
- architecture.md §2 (frontend/ms1/ms2 rule), §4 (folder structure), §5 (app flow)
- schema.md — full file. Generate the Drizzle schema from the mermaid
  ERD in §1 exactly (field names, types, FKs). Tables: users, businesses,
  submissions, material_classifications, matches, outreach_drafts,
  deal_events, verification_records, certificates, haulers,
  logistics_bookings.
- rules.md §2 (approved libraries), §4 (non-negotiable business rules),
  §5 (ms1 error handling), §6 (logging)
- phases.md — Phase 1a scope and exit checklist

Build in order:
1. docker-compose: postgres only
2. drizzle schema + migration matching schema.md exactly
3. auth: signup/login, JWT, role = business | operator
4. CRUD: businesses, submissions
5. ms2Client — internal HTTP client, base url from MS2_BASE_URL env var,
   calling the four endpoints defined in agents.md (/classify, /match,
   /draft, /verify) with the exact input/output shapes documented there
6. submission pipeline:
   createSubmission -> ms2Client.classify() -> enforce hazardFlag hard-block
   -> createMatch -> createOutreachDrafts (draft only)
   -> operatorApproveAndSend -> logDealEvent
   -> confirmVerification -> issueCertificate (requires both sides confirmed)
7. winston: structured JSON per rules.md §6 — every request, every ms2
   call, every send

Non-negotiable (rules.md §4 — do not implement around these):
- hazardFlag=true on a classification must never produce a match row
- sending an outreach draft requires humanApproved=true AND
  sentByOperatorId set — no code path sends without both
- certificate creation requires both verificationRecords.confirmed=true
- every state change writes a dealEvent row in the same transaction

Definition of done (phases.md Phase 1a exit checklist): `docker compose
up` boots postgres + ms1 on :4000, migrations run clean, one submission
flows end to end using a mocked ms2 response (use the fixtures format
described in agents.md §8). Real SES not needed yet — log the "send" as
a stub.
```

---

## Prompt 2 — ms2-agent-service

```
Build ms2-agent-service locally. Phase 1a, dev-only — no AWS or CI.

Stack: FastAPI (async) + LangGraph. No frontend exposure — only ms1
calls this.

Read first:
- architecture.md §3 (tech stack), §6 (service responsibility split)
- agents.md — full file. This is the authoritative spec for every
  endpoint: node-by-node internal logic, input/output schemas, failure
  handling, and confidence thresholds for all four agents (Scout,
  Alchemist, Negotiator, Verification). Implement exactly what's
  described there, not a simplified version.
- schema.md §4 (non-hazardous category taxonomy — build this as
  reference_data/categories.py, single source of truth)
- rules.md §2 (approved libraries — FastAPI primary, Flask only for
  sync webhook receivers, never agent logic), §4, §5 (ms2 error handling)
- phases.md — Phase 1a scope and exit checklist

Build in order (per agents.md sections 2–5):
1. reference_data/categories.py — six categories from schema.md §4
2. POST /classify   (Scout Agent, agents.md §2) — parse_input ->
   classify_category -> estimate_composition -> compute_confidence ->
   hazard_check -> followup_decision
3. POST /match      (Alchemist Agent, agents.md §3) —
   retrieve_reference_pairings -> discover_nearby_candidates ->
   score_candidates -> generate_rationale -> estimate_value.
   Mock geocoding/distance for now.
4. POST /draft      (Negotiator Agent, agents.md §4) — determine_terms
   -> draft_source_message -> draft_target_message -> self_check_tone.
   Draft only — this service never sends anything, ever.
5. POST /verify     (Verification Agent, agents.md §5) —
   validate_evidence_presence -> compute_co2e_avoided ->
   compute_dollars_saved -> cite_methodology

Non-negotiable:
- no SES calls, no "sent" status anywhere in this service — ms1 owns
  every side effect, this service only reasons and returns data
- not publicly exposed; only reachable via ms1's MS2_BASE_URL
- Alchemist Agent must complete retrieve_reference_pairings before
  generating any rationale (rules.md §4.6 — grounded reasoning, not
  model knowledge alone)

Definition of done (phases.md Phase 1a exit checklist): `uvicorn` runs
on :8000, all four endpoints return valid JSON matching the schemas in
agents.md against the fixture set described in agents.md §8 (clean
high-confidence, low-confidence, hazardous-category, malformed-input
cases), classify() correctly hazard-flags anything outside the six
categories.
```

---

## Prompt 3 — frontend

```
Build the Next.js frontend locally. Phase 1a, dev-only — no deployment.

Read first:
- Figma file: https://www.figma.com/design/mPBDQWsE8Dnw2BPlrHAKBA
  Page "Lo-Fi Wireframes (B&W)" — 19 Phase 1 frames (Auth, Business Flow,
  Operator Flow), each with INPUT / ACTION / SUCCESS / FAIL annotations.
  Build screens matching frame names exactly; follow the SUCCESS/FAIL
  redirects labeled on each frame — do not invent new navigation.
- architecture.md §2 (frontend calls ms1 only, never ms2), §8 (design
  reference)
- rules.md §3 (what to avoid), §5 (frontend error handling — every
  screen needs an explicit error state matching its Figma frame's FAIL
  annotation)
- phases.md — Phase 1a scope and exit checklist

Build in order:
1. auth: Login, Sign Up, Business Profile Setup
2. business flow: Business Home -> Submit Surplus ->
   [Follow-up Clarification | Hazard Block | Classification Result] ->
   Match Notification -> Deal Timeline -> Verification Submission ->
   Impact Certificate
3. operator flow: Operator Dashboard -> Submission Review Queue ->
   Match Review & Approval -> Outreach Draft Editor ->
   Deal Detail & Audit Log -> Verification Review -> Reporting

Non-negotiable:
- every apiClient call targets NEXT_PUBLIC_API_BASE_URL (ms1) only
- Outreach Draft Editor has two independent send buttons (source, target)
  — no "approve both" shortcut, ever
- redirect behavior on each screen matches its Figma frame's SUCCESS/FAIL
  footer exactly
- loading and empty states required for every list/data view, not just
  the happy path (rules.md §5)

Definition of done (phases.md Phase 1a exit checklist): `npm run dev`
on :3000, every screen reachable via its specified redirects, forms
submit to http://localhost:4000 and render whatever ms1 returns —
mocked ms1 responses are fine while ms1 and ms2 are still being built
in parallel.
```

---

## After all three pass local Definition of Done

This is Phase 1a's exit checklist from `phases.md` — do not start Phase
1b (local integration) or any production infra until:

1. A submission can flow start-to-finish across all three services
   running locally together (not just individually)
2. Every rule in `rules.md` §4 has a passing test, not just a manual check
3. `docker compose up` from the repo root boots all three services +
   postgres in one command

Phase 1b is a separate prompt set — see `phases.md` for what it covers.
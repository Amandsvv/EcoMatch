# EcoMatch — Local Setup Prompts (Phase 1a)

Three self-contained prompts, one per service. This file is the execution
plan referenced by `prompt.txt` (the master entry point) — read that first.
Each prompt below points to specific sections of `PRD.md`, `architecture.md`,
`schema.md`, `agents.md`, `rules.md`, and `phases.md` rather than repeating
their content.

> **v2 note:** These prompts reflect the removal of the operator-approval
> gate. `outreach_drafts` are now in-platform proposals each business
> accepts/rejects itself; `operator` is renamed `admin` and is supervisory
> only. See `architecture.md`, `agents.md`, `schema.md`, and `rules.md` for
> the full change.

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
- architecture.md §2 (frontend/ms1/ms2 rule), §4 (folder structure), §5
  (app flow — note there is now exactly one required human checkpoint per
  side of a match: each business accepting its own proposal, not an
  operator step), §6 (admin is supervisory, not a workflow gate)
- schema.md — full file. Generate the Drizzle schema from the mermaid
  ERD in §1 exactly (field names, types, FKs). Tables: users, businesses,
  submissions, material_classifications, matches, outreach_drafts,
  deal_events, verification_records, certificates, haulers,
  logistics_bookings. Pay attention to outreach_drafts' fields:
  status (pending/accepted/rejected), responded_by_user_id, responded_at,
  notified_at — there is no human_approved/sent_by_operator_id anymore.
- rules.md §2 (approved libraries), §4 (all eight non-negotiable business
  rules — §4.2, §4.7, and §4.8 are new/changed, read them carefully),
  §5 (ms1 error handling), §6 (logging)
- phases.md — Phase 1a scope and exit checklist

Build in order:
1. docker-compose: postgres only
2. drizzle schema + migration matching schema.md exactly
3. auth: signup/login, JWT, role = business | admin
4. CRUD: businesses, submissions
5. ms2Client — internal HTTP client, base url from MS2_BASE_URL env var,
   calling the four endpoints defined in agents.md (/classify, /match,
   /draft, /verify) with the exact input/output shapes documented there
6. submission pipeline:
   createSubmission -> ms2Client.classify() -> enforce hazardFlag hard-block
   -> ms2Client.match() -> enforce matchConfidence < 0.7 suppression
      (treat identically to "no match found yet" — do NOT persist a row)
   -> if matchConfidence >= 0.7: createMatch -> ms2Client.draft()
      -> createOutreachDrafts (status=pending, one row per side)
      -> notify both businesses (stub SES: login-prompt-only content, no
         terms, no contact info)
   -> acceptOutreachDraft(matchId, side) / rejectOutreachDraft(matchId, side)
      — callable only by the business user who owns that side; reject
      updates matches.status=rejected; when BOTH sides are accepted,
      matches.status=both_accepted
   -> logDealEvent on every state change, same transaction
   -> scheduleLogistics (stub hauler assignment) once both_accepted
   -> confirmVerification (business-submitted, or admin spot-check)
      -> issueCertificate (requires both verificationRecords.confirmed=true)
7. admin console endpoints (read-mostly): business verification queue,
   flagged/low-confidence-pattern monitoring via deal_events, hauler
   CRUD, dispute notes, audit log views — none of these gate the pipeline
   above; they're supervisory reads/writes only
8. winston: structured JSON per rules.md §6 — every request, every ms2
   call, every accept/reject action (attributed to the responding business
   user), every deal_events write

Non-negotiable (rules.md §4 — do not implement around these):
- hazardFlag=true on a classification must never produce a match row
- matchConfidence < 0.7 must never produce a persisted match row and must
  never be shown to either business
- accepting/rejecting an outreach_draft is only ever callable by the
  business user on that side — no admin override path in the happy path
- no ms1 endpoint ever returns the counterpart business's phone/address
  to the other business — contact only reaches the hauler, after
  both_accepted
- certificate creation requires both verificationRecords.confirmed=true
- every state change writes a dealEvent row in the same transaction

Definition of done (phases.md Phase 1a exit checklist): `docker compose
up` boots postgres + ms1 on :4000, migrations run clean, one submission
flows end to end using a mocked ms2 response (use the fixtures format
described in agents.md §8), including a mocked accept from both business
fixtures reaching both_accepted. Real SES not needed yet — log the
notification send as a stub. Admin endpoints exist but nothing in the
happy-path test depends on an admin action.
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
  Alchemist, Negotiator, Verification). Note the Alchemist's confidence
  floor is now 0.7 and suppression-based, not a two-tier flag-for-review
  scheme — implement exactly what's described there, not a simplified
  or the old version.
- schema.md §4 (non-hazardous category taxonomy — build this as
  reference_data/categories.py, single source of truth)
- rules.md §2 (approved libraries — FastAPI primary, Flask only for
  sync webhook receivers, never agent logic), §4 (especially §4.2 —
  Negotiator drafts must never include contact info — and §4.7), §5
  (ms2 error handling)
- phases.md — Phase 1a scope and exit checklist

Build in order (per agents.md sections 2–5):
1. reference_data/categories.py — six categories from schema.md §4
2. POST /classify   (Scout Agent, agents.md §2) — parse_input ->
   classify_category -> estimate_composition -> compute_confidence ->
   hazard_check -> followup_decision
3. POST /match      (Alchemist Agent, agents.md §3) —
   retrieve_reference_pairings -> discover_nearby_candidates ->
   score_candidates -> generate_rationale -> estimate_value.
   matchConfidence < 0.7 must return an explicit suppressed/no-match-style
   response — the same shape ms1 treats as "no match found yet," not a
   flagged-but-returned result. Mock geocoding/distance for now.
4. POST /draft      (Negotiator Agent, agents.md §4) — determine_terms
   -> draft_source_message -> draft_target_message -> self_check_tone.
   Output is an in-platform proposal for each business's own dashboard —
   never contact info, never implies the other side has already accepted,
   and this service never sends anything to anyone, ever.
5. POST /verify     (Verification Agent, agents.md §5) —
   validate_evidence_presence -> compute_co2e_avoided ->
   compute_dollars_saved -> cite_methodology

Non-negotiable:
- no SES calls, no "sent" or "accepted" status anywhere in this service —
  ms1 owns every side effect and every workflow-state write, this service
  only reasons and returns data
- not publicly exposed; only reachable via ms1's MS2_BASE_URL
- Alchemist Agent must complete retrieve_reference_pairings before
  generating any rationale (rules.md §4.6 — grounded reasoning, not
  model knowledge alone)
- Negotiator Agent output must never include either business's phone or
  address (rules.md §4.2)

Definition of done (phases.md Phase 1a exit checklist): `uvicorn` runs
on :8000, all four endpoints return valid JSON matching the schemas in
agents.md against the fixture set described in agents.md §8 (clean
high-confidence, below-0.7-confidence — correctly suppressed for
Alchemist / triggers follow-up for Scout, hazardous-category, and
malformed-input cases), classify() correctly hazard-flags anything
outside the six categories, match() correctly suppresses anything below
0.7 instead of flagging it for review.
```

---

## Prompt 3 — frontend

```
Build the Next.js frontend locally. Phase 1a, dev-only — no deployment.

Read first:
- Figma file: https://www.figma.com/design/mPBDQWsE8Dnw2BPlrHAKBA
  Page "Lo-Fi Wireframes (B&W)" — 19 Phase 1 frames (Auth, Business Flow,
  Admin Flow), each with INPUT / ACTION / SUCCESS / FAIL annotations.
  NOTE: any frame still named for the old operator flow (e.g. "Operator
  Dashboard", "Match Review & Approval", "Outreach Draft Editor") is
  superseded by architecture.md §8's v2 note — flag this discrepancy to
  a human and confirm which frames still apply rather than guessing
  whether to build the old or new version of that screen.
- architecture.md §2 (frontend calls ms1 only, never ms2), §5 (app flow —
  Match Review is now an accept/reject action taken by the business
  itself), §8 (design reference + the Figma staleness note above)
- rules.md §3 (what to avoid), §4.2 and §4.8 (no contact info ever shown
  in the UI; only the owning business's user can accept/reject their
  side), §5 (frontend error handling — every screen needs an explicit
  error state matching its Figma frame's FAIL annotation)
- phases.md — Phase 1a scope and exit checklist

Build in order:
1. auth: Login, Sign Up, Business Profile Setup
2. business flow: Business Home -> Submit Surplus ->
   [Follow-up Clarification | Hazard Block | Classification Result] ->
   Match Notification -> Match Review (Accept/Reject) -> Deal Timeline ->
   Verification Submission -> Impact Certificate
3. admin flow: Admin Dashboard -> Business Verification Queue ->
   Match/Fraud Monitoring -> Dispute Review -> Hauler Management ->
   Audit Log -> Reporting

Non-negotiable:
- every apiClient call targets NEXT_PUBLIC_API_BASE_URL (ms1) only
- Match Review screen shows each business only its own proposal, with
  independent Accept and Reject actions — no "approve both" shortcut,
  and no field anywhere in the UI displays the counterpart business's
  phone or address before or after acceptance (that only ever reaches
  the hauler, never the frontend, per architecture.md §7)
- redirect behavior on each screen matches its Figma frame's SUCCESS/FAIL
  footer exactly, except where the frame itself is flagged stale (see
  the note above — confirm with a human before building those)
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
   running locally together (not just individually), including both
   businesses independently accepting their own side with no operator
   or admin action required
2. Every rule in `rules.md` §4 has a passing test, not just a manual check
3. `docker compose up` from the repo root boots all three services +
   postgres in one command

Phase 1b is a separate prompt set — see `phases.md` for what it covers.

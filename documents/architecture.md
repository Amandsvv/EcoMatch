# EcoMatch — Architecture

**See also:** `PRD.md` (features/users) · `schema.md` (data model) · `rules.md` (build constraints) · `phases.md` (rollout plan)

> **v2 note:** The operator-approval gate on match review and outreach sending has been removed from the critical path. `operator` is renamed `admin` throughout and is now a marketplace-supervision role (verify businesses, suspend users, monitor AI quality/fraud, manage haulers, review reports, oversee disputes, audit the system) — not a required step for any submission to reach a certificate. In its place: businesses accept or reject their own match proposals in-platform, contact info is never revealed between businesses, and logistics contact flows only through a hauler. See §5–§7 below and `rules.md` §4.

---

## 1. System Architecture

```
                              USER LAYER
                    Business User          Admin
                        │                    │
                        └──────┬─────────────┘
                                ▼
                     PRESENTATION LAYER
              Next.js Frontend (single app, role-based views)
   Auth · Dashboard · Material Submission · Match Review (accept/reject)
        · Deal Tracker · Reports · Profile · Admin Console
                                │
                    (frontend talks ONLY to ms1)
                                ▼
        ┌───────────────────────────────────────────┐
        │           APPLICATION LAYER                  │
        │                                                │
        │  ms1 — Express.js Core API   ms2 — FastAPI     │
        │  (TypeScript)                Agent Service     │
        │  ─────────────────────       (Python)          │
        │  Auth, JWT                   Scout Agent        │
        │  Business Mgmt               Hazard Detection    │
        │  Material Mgmt                Material Classify   │
        │  Match Mgmt                  Alchemist Agent      │
        │  Deal Workflow                Reuse Reasoning      │
        │  Audit Logs                  Nearby Biz Discovery  │
        │  Notifications                Compatibility Score  │
        │  Dashboard API                Negotiator Agent      │
        │  Admin Console API           Verification Agent     │
        │           ────────► internal calls ────────►         │
        └───────────────────────────────┬───────────────────────┘
                                          ▼
                                  DATABASE LAYER
                              PostgreSQL — system of record
                                          │
                                          ▼
                          INFRASTRUCTURE LAYER
       Docker · NGINX · GitHub Actions · AWS EC2 · AWS SES · OpenTelemetry
```

## 2. Hard Architectural Rule

**The Next.js frontend calls ms1 (Express) only. It never calls ms2 (FastAPI) directly.**

ms1 owns auth, persistence, workflow state, and email dispatch. Whenever a step needs agentic reasoning (classification, matching, drafting, verification impact calculation), **ms1 calls ms2 internally** and persists the result. This keeps:

- One API surface and one auth scheme for the frontend
- ms2 with no public exposure
- One clean OpenTelemetry trace per request (frontend → ms1 → ms2 → back)

If a feature seems to need the frontend to call ms2 directly, that's a signal to add a new ms1 endpoint that proxies to ms2 — not an exception to this rule. See `rules.md` §3 for the explicit prohibition.

## 3. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js (React, TypeScript) | Single app, role-based routing (`business` / `admin`) |
| Core API (ms1) | Express.js + TypeScript | Auth, persistence, workflow, email dispatch |
| ORM (ms1) | Drizzle ORM | Postgres, schema-first, migrations in-repo |
| Logging (ms1) | Winston | Structured JSON |
| Agent Service (ms2) | FastAPI (async, primary) | All agent endpoints |
| Agent Service (ms2), secondary | Flask | Simple sync webhook receivers only (e.g. SES bounce webhook) — never agent logic |
| Agent orchestration | LangGraph / LangChain | Lives inside ms2 only |
| Database | PostgreSQL | One database, shared, ms1 owns migrations |
| Containerization | Docker + docker-compose | |
| Reverse proxy | NGINX | TLS termination, routing |
| Deployment | AWS EC2 | HTTPS via certbot |
| Email | AWS SES | **Notification nudges only** ("you have a new match — log in to review") — never deal content, terms, or contact info; see §7 |
| CI/CD | GitHub Actions | Path-filtered per service |
| Observability | OpenTelemetry | Full-stack trace |
| Geocoding | OpenCage Geocoding API | No-billing-account free tier; see `rules.md` §2 for why over Google Maps |

## 4. Monorepo Folder Structure

```
ecomatch/
├── .github/workflows/          # path-filtered CI/CD per service
│   ├── frontend.yml
│   ├── ms1-core-api.yml
│   └── ms2-agent-service.yml
├── frontend/                   # Next.js app
├── ms1-core-api/                # Express + TypeScript
│   ├── src/
│   │   ├── auth/
│   │   ├── businesses/
│   │   ├── submissions/
│   │   ├── matches/
│   │   ├── outreach/
│   │   ├── dealEvents/
│   │   ├── verification/
│   │   ├── certificates/
│   │   ├── logistics/
│   │   ├── admin/                # verification queue, fraud/dispute review, audit views
│   │   ├── db/                  # Drizzle schema + migrations
│   │   └── lib/                 # ms2 client, SES client, logger
│   └── drizzle/                 # generated migrations
├── ms2-agent-service/           # FastAPI + LangGraph
│   ├── app/
│   │   ├── agents/
│   │   │   ├── scout.py
│   │   │   ├── alchemist.py
│   │   │   ├── negotiator.py
│   │   │   └── verification.py
│   │   ├── reference_data/      # emission factors, category taxonomy
│   │   └── routers/
├── infra/
│   ├── docker-compose.yml
│   ├── nginx/
│   └── ec2/
├── docs/
│   ├── PRD.md
│   ├── architecture.md
│   ├── rules.md
│   ├── phases.md
│   └── schema.md
```

## 5. App Flow — Core Lifecycle

The full submission-to-certificate journey, in order. **There is now exactly one required human checkpoint per side of a match — each business accepting its own proposal — not an operator review step.** Admin involvement is oversight/exception-handling only, and does not gate this flow (see §6).

1. **Business submits surplus** (frontend → ms1) — photo, description, disposal cost, frequency
2. **Scout Agent classifies** (ms1 → ms2 `/classify`) — category, subtype, confidence, `hazard_flag`
3. **Hazard check** — if `hazard_flag=true`, stop here permanently; this submission can never become a match (`rules.md` §4)
4. **Alchemist Agent proposes a match** (ms1 → ms2 `/match`) — nearby candidate, rationale, confidence, estimated value. **If `matchConfidence < 0.7`, stop here** — nothing is persisted or shown; this is treated identically to "no match found yet" (`agents.md` §3)
5. **Negotiator Agent drafts both proposals** (ms1 → ms2 `/draft`) — automatically, as soon as step 4 clears the confidence floor; no approval step in between
6. **ms1 notifies both businesses** (SES nudge — "you have a new match, log in") — no deal content or contact info in the email itself
7. **Each business independently reviews and accepts or rejects its own proposal**, in-platform — this is the human checkpoint that replaces operator approval. If either side rejects, the match is marked `rejected`; the Alchemist/Negotiator may be re-run for a different candidate or adjusted terms.
8. **Both accepted** → `matches.status = both_accepted`; logistics scheduled via a curated hauler list (Phase 1) — the hauler receives pickup/dropoff contact details, the businesses still do not receive each other's contact details directly (§7 below)
9. **Both businesses submit verification evidence** — photo or receipt, independently
10. **ms1 confirms both verifications and calls** `/verify` **for impact calc** — this can be done by either business's own submission triggering the check, or by an admin during a spot-check; it does not require a dedicated approval action the way the old operator-confirm step did
11. **Certificate issued** — CO2e avoided + dollars saved, only after step 10 passes

Full field-level detail for every entity touched in this flow lives in `schema.md`.

## 6. Service Responsibility Split

**ms1 (Express) owns:** authentication, business/submission CRUD, match/deal state machine (now driven by business accept/reject rather than operator approval), `deal_events` audit logging, SES notification dispatch, dashboards, the admin console API, and every side effect (nothing ever gets "sent" or "issued" from ms2).

**ms2 (FastAPI) owns:** all agentic reasoning — classification, match rationale, in-platform proposal drafting, verification impact calculation. It is stateless from the outside: given the same input, it returns a result; it never marks anything as accepted, sent, or persists workflow state itself.

**Admin (a `users.role`, not a service) is responsible for:**
- Verifying businesses before/after onboarding
- Suspending users for fraud or abuse
- Monitoring AI output quality (classification accuracy, match confidence calibration) — feeding back into `agents.md` §7's threshold tuning
- Monitoring for fraud or suspicious deal patterns via `deal_events`
- Managing the curated `haulers` list
- Reviewing aggregate reports
- Overseeing disputes between businesses
- Auditing the system end-to-end

None of the above are required for a submission to become a certificate — admin is supervisory, closer to how Uber/Airbnb admin consoles work, not a workflow gate.

## 7. Business-to-Business Communication

There is **no in-app real-time chat** between businesses in Phase 1, and — unlike the original design — **contact information is never revealed between the two businesses in a match, at any stage.** This is a deliberate design choice, not just a privacy default: it keeps EcoMatch load-bearing for every future transaction between a pair of businesses, not just their first match (see `PRD.md` §7 for the business-model reasoning).

1. Negotiator Agent drafts an in-platform proposal for each side, automatically once a match clears the confidence floor
2. ms1 sends a notification nudge via SES to each business — login prompt only, no terms or contact info in the email
3. Each business logs in and independently **accepts or rejects** its own proposal (`architecture.md` §5, step 7) — **Accept/Reject only in Phase 1, no counter-offer mechanism.** If a business wants different terms, the only path is to reject; the Alchemist/Negotiator can then be re-run with adjusted terms or a different candidate. A structured counter-offer flow is a Phase 2 item (`phases.md`).
4. Once **both** sides accept, logistics is scheduled through a hauler (`haulers`/`logistics_bookings`) — the hauler receives pickup/dropoff contact details for both businesses because it is a trusted third party under contract with EcoMatch, not a counterparty. **The two businesses still never receive each other's direct contact info from EcoMatch.**
5. If terms change after logistics is underway, this is logged as a `deal_events` entry, attributed to whichever business user or admin recorded it — there is no outside email conversation to fall out of sync with anymore, since none ever starts

This is a deliberate Phase 1 simplification in one respect only (Accept/Reject vs. a full negotiation UI) — not a bug, and not something a later phase should read as "add back email negotiation." A later phase could add a structured in-app counter-offer mechanism so terms disagreements don't require a full reject-and-rematch cycle (see `phases.md` §Phase 2 for where this would go). Direct contact reveal between businesses is **not** planned for any phase — see `phases.md` §Phase 2 note.

## 8. Design Reference

Low-fidelity B&W wireframes for all 19 Phase 1 screens (Auth, Business Flow, Admin Flow), each annotated with input fields, actions, and success/fail redirects, live in the project Figma file: `https://www.figma.com/design/mPBDQWsE8Dnw2BPlrHAKBA`, page **"Lo-Fi Wireframes (B&W)"**. Frontend build order should follow the frame order on that page. **Note:** frame names in the existing Figma referencing "Operator" (e.g. "Operator Dashboard", "Match Review & Approval", "Outreach Draft Editor") should be treated as superseded by this doc's admin/accept-reject model until the Figma file itself is updated — flag this discrepancy rather than silently building either the old or new version without confirming which frames still apply.

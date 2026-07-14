# EcoMatch — Architecture

**See also:** `PRD.md` (features/users) · `schema.md` (data model) · `rules.md` (build constraints) · `phases.md` (rollout plan)

---

## 1. System Architecture

```
                              USER LAYER
                 Business User    Operator    Admin
                        │            │          │
                        └──────┬─────┴──────────┘
                                ▼
                     PRESENTATION LAYER
              Next.js Frontend (single app, role-based views)
   Auth · Dashboard · Material Submission · Match Explorer
        · Deal Tracker · Reports · Profile
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
        │                               Verification Agent     │
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
| Frontend | Next.js (React, TypeScript) | Single app, role-based routing |
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
| Email | AWS SES | Outreach, verification reminders, certificates |
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

The full submission-to-certificate journey, in order. Every step here maps to a specific service and, where relevant, a specific human checkpoint.

1. **Business submits surplus** (frontend → ms1) — photo, description, disposal cost, frequency
2. **Scout Agent classifies** (ms1 → ms2 `/classify`) — category, subtype, confidence, `hazard_flag`
3. **Hazard check** — if `hazard_flag=true`, stop here permanently; this submission can never become a match (`rules.md` §4)
4. **Alchemist Agent proposes a match** (ms1 → ms2 `/match`) — nearby candidate, rationale, confidence, estimated value
5. **Operator reviews the match** — first human checkpoint; approve or reject
6. **Negotiator Agent drafts outreach** (ms1 → ms2 `/draft`) — two drafts, one per side, draft-only
7. **Operator reviews, edits, and individually sends each draft** — second and strictest human checkpoint; no auto-send path exists anywhere in the codebase
8. **Businesses negotiate** — communication moves to email/phone outside the app once the first message is sent (§7 below); operator manually logs any terms changes as `deal_events`
9. **Deal agreed** — logistics scheduled via a curated hauler list (Phase 1)
10. **Both businesses submit verification evidence** — photo or receipt, independently
11. **Operator confirms both verifications** (ms1 → ms2 `/verify` for impact calc)
12. **Certificate issued** — CO2e avoided + dollars saved, only after step 11 passes

Full field-level detail for every entity touched in this flow lives in `schema.md`.

## 6. Service Responsibility Split

**ms1 (Express) owns:** authentication, business/submission CRUD, match/deal state machine, `deal_events` audit logging, SES dispatch, dashboards, and every side effect (nothing ever gets "sent" or "issued" from ms2).

**ms2 (FastAPI) owns:** all agentic reasoning — classification, match rationale, outreach drafting, verification impact calculation. It is stateless from the outside: given the same input, it returns a result; it never marks anything as sent or persists workflow state itself.

## 7. Business-to-Business Communication

There is **no in-app real-time chat** between businesses in Phase 1. Communication happens over email, outside the app, after the first operator-approved outreach message is sent:

1. Negotiator Agent drafts the first message for each side
2. Operator approves and sends via SES
3. Businesses now have each other's contact info and can reply directly — normal email, not tracked automatically by EcoMatch
4. If terms change through that outside conversation, the **operator manually logs it** as a `deal_events` entry so the audit trail stays complete
5. If needed, the operator can loop back to the Negotiator Agent to draft a follow-up with updated terms

This is a deliberate Phase 1 simplification — not a bug. A later phase could add proper in-app messaging so replies flow back automatically instead of relying on the operator to log manually (see `phases.md` §Phase 2 for where this would go).

## 8. Design Reference

Low-fidelity B&W wireframes for all 19 Phase 1 screens (Auth, Business Flow, Operator Flow), each annotated with input fields, actions, and success/fail redirects, live in the project Figma file: `https://www.figma.com/design/mPBDQWsE8Dnw2BPlrHAKBA`, page **"Lo-Fi Wireframes (B&W)"**. Frontend build order should follow the frame order on that page.

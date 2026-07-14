# EcoMatch — Rules

**See also:** `PRD.md` (features/users) · `architecture.md` (system design) · `schema.md` (data model) · `phases.md` (rollout plan)

This file is the guardrail document. If code contradicts this file, the code is wrong — fix the code, don't edit this file to match it, unless a human explicitly approves the change.

---

## 1. Purpose

Guardrails for anyone — human or AI agent — building or modifying EcoMatch. Read this before touching `matches`, `outreach_drafts`, or `certificates` in any service.

## 2. Approved Libraries & Tech (use these, don't substitute)

| Concern | Use | Do not use instead |
|---|---|---|
| ms1 web framework | Express + TypeScript | NestJS, Fastify, Koa |
| ms1 ORM | Drizzle | Prisma, TypeORM, raw SQL strings |
| ms1 logging | Winston, structured JSON | console.log, unstructured strings |
| ms2 web framework | FastAPI (async) | Django, sync-only Flask for agent logic |
| ms2 secondary framework | Flask — **sync webhook receivers only** (e.g. SES bounce) | Flask for any agent/reasoning endpoint |
| Agent orchestration | LangGraph / LangChain, inside ms2 only | Any orchestration logic in ms1 or frontend |
| Frontend | Next.js + TypeScript | Plain React SPA, CRA |
| Geocoding | OpenCage Geocoding API | Google Maps Geocoding API in Phase 1 — requires a billing-enabled account for even the free tier, unnecessary setup friction right now. Google Places Autocomplete may be added later purely for UX; that's a separate, optional addition, not a replacement for OpenCage. |
| Email | AWS SES | Any other transactional email provider |
| DB | PostgreSQL, single instance, shared by ms1 and ms2 | A second database per service |

## 3. What to Avoid

- **Do not let the frontend call ms2 directly.** Every frontend API call targets ms1. If a task seems to need this, add an ms1 endpoint that proxies to ms2 instead.
- **Do not create a third backend service.** There are exactly two: ms1 and ms2.
- **Do not build any auto-send capability**, behind a feature flag or otherwise. Outreach sending is manual, forever, for first contact between two businesses (see §4).
- **Do not build in-app real-time chat between businesses in Phase 1.** Communication is by email, outside the app, once outreach is sent — see `architecture.md` §7.
- **Do not maintain the non-hazardous category list in more than one place.** Single source of truth: `ms2-agent-service/app/reference_data/categories.py`. ms1 and the frontend must read/cache from there, never hardcode a second copy.
- **Do not wire up Google Maps billing for Phase 1** unless a human explicitly decides the autocomplete UX is worth the setup cost.
- **Do not build live hauler API booking, e-signature, multi-region rules, or confidentiality-preserving previews in Phase 1** — these are Phase 2, see `phases.md`.

## 4. Non-Negotiable Business Rules

These are enforced in the data model and application layer — not only the UI. Every rule below needs an automated test that asserts it directly against the service/DB layer, not just a manual UI check.

1. **A `material_classification` with `hazard_flag = true` must never produce a `match` row.** Enforced in ms1's create-match service logic.
2. **No code path may send an `outreach_draft` without `human_approved = true` and a non-null `sent_by_operator_id`.**
3. **A `certificate` may only be created once both `verification_records` for a match have `confirmed = true`.**
4. **`deal_events` must be written for every state-changing action** on a match, in the same transaction as the change itself — not as a separate afterthought pass.
5. **The frontend calls ms1 only** (§3, §2 of `architecture.md`).
6. **The Alchemist Agent's compatibility reasoning must be grounded in `reference_data/`, not model knowledge alone.** New material categories get added to reference data first, reasoning logic second.

## 5. Error Handling

**ms1:**
- Every API error returns a structured shape: `{ error: string, code: string, message: string }` — never a bare 500 with no body.
- A failed call to ms2 is logged with latency and the ms2 error body, and surfaces to the frontend as a distinguishable "AI service unavailable" state, not a generic failure.
- Database constraint violations (e.g. an attempted hazardous match) should be caught and returned as a clear 4xx with the specific rule violated — not swallowed or turned into a 500.

**ms2:**
- Agent failures (LLM timeout, malformed output, low-confidence result below a usable threshold) return a typed error response, not a raw exception trace.
- Every agent call logs model name, latency, and confidence score — required for later calibration debugging, not optional.
- ms2 endpoints must be safe to retry — no partial side effects, since it owns no persistence itself (see `architecture.md` §6).

**Frontend:**
- Every screen has an explicit error state, matching the FAIL annotations on its Figma frame — no silent failures, no unhandled promise rejections shown as a blank screen.
- Loading and empty states are required for every list/data view, not just the happy path.

## 6. Logging & Observability

- ms1: Winston, structured JSON, every request tagged with a `traceId`. Log at minimum: incoming request, outbound ms2 call (with latency), outbound SES send, every `deal_events` write.
- ms2: Python JSON logging, tagged with model name, latency, confidence per agent call.
- OpenTelemetry: one trace should span a full request across frontend → ms1 → ms2 → back.

## 7. Boundaries for AI Coding Agents

1. Read §4 (non-negotiable business rules) before writing any code touching `matches`, `outreach_drafts`, or `certificates`. If a change would let any of those five rules be bypassed, stop and flag it — don't implement it.
2. Don't invent new top-level services. Exactly two backends, one frontend.
3. Don't have the frontend call ms2. If you're about to call a `:8000` URL from frontend code, stop — add or reuse an ms1 endpoint.
4. Keep the hazardous-category list in exactly one place (§3).
5. Every new ms2 agent capability needs grounded reference data alongside it, not just a new prompt.
6. Write the `deal_events` row in the same transaction as the state change it describes.
7. When in doubt about scope, check `phases.md`. Don't build a later phase's features just because they seem like a natural extension of current work.

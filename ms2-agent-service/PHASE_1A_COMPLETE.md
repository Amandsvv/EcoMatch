# ms2-agent-service — Phase 1a Complete

**FastAPI + Stateless Reasoning** | **4 Agent Endpoints** | **Phase 1a Local Development** ✅

---

## Summary

ms2-agent-service is the **reasoning-only backend** for EcoMatch's material classification and matching system. It exposes 4 FastAPI endpoints for the 4 agents specified in `agents.md`:

1. **Scout Agent** (`POST /classify`) — Material classification + hazard detection
2. **Alchemist Agent** (`POST /match`) — Compatible business matching
3. **Negotiator Agent** (`POST /draft`) — In-platform proposal drafting
4. **Verification Agent** (`POST /verify`) — CO2e + savings calculation

**No database. No side effects. No sends.** All state lives in ms1. ms2 is pure reasoning.

---

## What's Implemented

### ✅ All 4 Agents

| Agent | Purpose | Confidence Threshold | Key Behaviors |
|---|---|---|---|
| **Scout** | Material classification + hazard detection | 0.7 | Asks ONE clarifying Q if conf < 0.7; hazard_flag=true if unknown category |
| **Alchemist** | Find compatible nearby business | 0.7 | Suppresses result if conf < 0.7 (same as no_candidates from ms1's view); rationale GROUNDED in reference_data |
| **Negotiator** | Draft two in-platform proposals | N/A (tone check) | Never includes contact info; never implies deal confirmed; never sends anything |
| **Verification** | Calculate CO2e + dollars saved | N/A | Applies EPA WARM v16 methodology; conservative estimates |

### ✅ All 4 Endpoints

```
POST /classify    — Scout Agent (classification + hazard check)
POST /match       — Alchemist Agent (compatibility matching)
POST /draft       — Negotiator Agent (proposal drafting)
POST /verify      — Verification Agent (impact calculation)
```

All endpoints are **stateless, async-ready, type-safe (Pydantic)**.

### ✅ Reference Data

**File:** `app/reference_data/categories.py`

- 6 allowed material categories (organic_biomass, cardboard_paper, used_cooking_oil, textile_offcuts, wood_pallets_untreated, packaging_plastic)
- Compatible business types per category
- Market reference prices
- EPA WARM v16 emission factors (CO2e per ton)

Single source of truth for all agent reasoning.

### ✅ Logging

JSON structured logging to stdout with:
- timestamp, level, message
- Context fields: submissionId, matchId, sourceBusinessId, confidence, hazardFlag, etc.
- Latency metrics (ms)
- Error traces

### ✅ Testing

- **Unit tests** for each agent (high conf, low conf, hazardous cases)
- **Integration tests** (full pipeline: classify → match → draft → verify)
- **Test fixtures** (pre-built responses for all scenarios)
- **pytest + pytest-asyncio** configured

### ✅ Docker Support

- Dockerfile (multi-stage, slim Python 3.11)
- docker-compose.yml (ms2 service only; can be composed with ms1 + frontend later)
- Health checks configured

---

## Key Design Decisions

### 1. Stateless + Idempotent

✅ No database calls  
✅ No state mutations  
✅ All requests → all context passed in payload  
✅ Retries are always safe

### 2. Grounded Reasoning (Not Magic)

✅ Rationales are GROUNDED in reference_data (not model-invented)  
✅ Emission factors come from EPA WARM (auditable)  
✅ Confidence thresholds are explicit (0.7 floor, fail-safe on hazards)

### 3. No Contact Info Leakage

✅ Negotiator agent NEVER includes phone/address in drafts  
✅ Drafts are for in-platform display only (never forwarded externally)  
✅ Contact info verified by runtime check in tone self-check

### 4. Suppression-Based Filtering

✅ Alchemist confidence < 0.7 → suppressed (not low-confidence result)  
✅ ms1 treats suppressed result same as no_candidates_in_radius  
✅ No binary flags; just don't return a match if confidence below floor

---

## Architecture

### Phase 1a: Direct Agent Methods

Each agent is a simple async class with typed request/response:

```python
# app/agents/scout.py
class ScoutAgent:
    async def classify(self, request: ClassifyRequest) -> ClassifyResponse:
        # Step 1: parse_input
        # Step 2: classify_category
        # Step 3: estimate_composition
        # Step 4: compute_confidence
        # Step 5: hazard_check
        # Step 6: followup_decision
        return ClassifyResponse(...)
```

Each router is a single endpoint that calls the agent:

```python
# app/routers/classify.py
@router.post("")
async def classify(request: ClassifyRequest) -> ClassifyResponse:
    return await scout_agent.classify(request)
```

### Phase 1b: LangGraph StateGraphs

Will refactor each agent into a LangGraph StateGraph with proper node/edge structure (no change to API).

---

## File Structure

```
ms2-agent-service/
├── app/
│   ├── main.py                    # FastAPI app
│   ├── models.py                  # Pydantic schemas
│   ├── logger.py                  # JSON logging
│   ├── agents/
│   │   ├── scout.py               # Scout Agent (classification)
│   │   ├── alchemist.py           # Alchemist Agent (matching)
│   │   ├── negotiator.py          # Negotiator Agent (drafting)
│   │   └── verification.py        # Verification Agent (impact)
│   ├── routers/
│   │   ├── classify.py            # POST /classify
│   │   ├── match.py               # POST /match
│   │   ├── draft.py               # POST /draft
│   │   └── verify.py              # POST /verify
│   └── reference_data/
│       └── categories.py          # 6 categories + factors
├── tests/
│   ├── test_agents.py             # Unit + integration tests
│   └── fixtures/
│       └── agent_fixtures.py      # Mock responses
├── run.py                         # Entry point
├── requirements.txt               # Dependencies
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Quick Start

### Local Development

```bash
# Install
pip install -r requirements.txt

# Create .env
cp .env.example .env

# Run (auto-reload dev mode)
python run.py

# Server on http://localhost:8000
# Docs on http://localhost:8000/docs
```

### Docker

```bash
docker-compose up
```

### Testing

```bash
pytest -v
```

---

## Non-Negotiable Rules (✅ All Implemented)

| Rule | Implementation |
|---|---|
| 4.1 — Hazard flag blocks match | Scout sets hazard_flag=true if category unknown; ms1 doesn't call Alchemist |
| 4.2 — No contact info in drafts | Negotiator tone check blocks contact info; verified in tests |
| 4.3 — Certificate needs both verified | ms1 gates call to /verify (ms2 trusts gate, but defensive re-check present) |
| 4.4 — Deal events logged | ms1's responsibility (ms2 logs agent calls only) |
| 4.5 — Alchemist conf < 0.7 suppressed | matchConfidence < 0.7 → no targetBusinessId returned (suppressed) |
| 4.6 — Scout asks one followup | Scout generates ONE followup Q if conf < 0.7; never loops |
| 4.7 — Reference data is source of truth | All factors, prices, categories in categories.py |
| 4.8 — Negotiator never sends | Negotiator returns drafts only; never touches network for sending |

---

## Phase 1a vs Phase 1b

### Phase 1a (Current)

- Direct agent methods (no LangGraph yet)
- Keyword-based classification mock (no LLM)
- Mock business database (no ms1 queries)
- Mock distance calculation (no real geocoding)
- Simple tone check (rule-based, no second LLM pass)

### Phase 1b

- LangGraph StateGraphs for each agent
- Real LLM calls (Anthropic Claude)
- Real ms1 database queries for candidates
- Real geocoding + distance (Google Maps API stub)
- Tone self-check via second LLM call
- Observability integration (trace IDs, metrics)

---

## Exit Checklist (Phase 1a)

- ✅ All 4 agents implemented
- ✅ All 4 endpoints expose agents
- ✅ Reference data configured
- ✅ Confidence thresholds implemented
- ✅ Logging structured (JSON)
- ✅ Tests written (unit + integration + fixtures)
- ✅ Docker support (Dockerfile + compose)
- ✅ No database calls (stateless)
- ✅ No SES sends (ms2 is reasoning-only)
- ✅ All 8 non-negotiable rules implemented

---

## Next Steps

1. **Local testing** — `pytest -v` and `python run.py` to verify locally
2. **Integration with ms1** — ms1 should be able to call ms2 endpoints
3. **Frontend build** (Phase 1b) — Create Next.js frontend
4. **Phase 1b enhancements** — Add LangGraph, real LLM, real queries
5. **Pilot execution** — Local 3-service stack (ms1 + ms2 + frontend)

---

**Built:** 2026-07-14  
**Status:** ✅ Complete, ready for local testing and Phase 1b integration

# EcoMatch — Product Requirements Document

**See also:** `architecture.md` (system design) · `schema.md` (data model) · `rules.md` (build constraints) · `phases.md` (rollout plan)

---

## 1. Executive Summary

EcoMatch is an agentic AI system that discovers, matches, and drafts deals between local businesses that generate non-hazardous surplus material and nearby businesses that can use those materials as inputs. It classifies surplus, reasons about compatible reuse pathways, discovers nearby candidate businesses, drafts outreach and deal terms, and keeps every external action behind a human-approval gate.

> "We find the business nearby that will pay for what you are paying to throw away — and we draft the deal, you just say yes."

## 2. Problem Statement

A business routinely pays disposal fees for material another nearby business would pay to acquire as raw input. This is a "double coincidence of wants" problem: both sides exist, but discovering each other, verifying material compatibility, and negotiating terms is too expensive for a human broker to do at SME scale.

**Pain points:**
- **Discovery failure** — businesses that produce and need compatible materials don't know each other exists
- **Compatibility uncertainty** — real reuse potential goes beyond keyword matching (e.g. brewery wastewater's nitrogen content makes it fertilizer, not just sewage)
- **Broker economics don't work** for small surplus volumes — not enough margin to justify a human broker's time
- **Manual outreach kills promising matches** — most potential matches die at the "someone has to actually reach out" step
- **No proof of impact** — businesses need evidence material was actually reused before any sustainability claim is credible

## 3. Target Users

| Persona | Who they are | Goal | Frustration |
|---|---|---|---|
| **Waste-generating SME** | Cafe, bakery, print shop, small manufacturer | Reduce disposal cost, ideally earn value from surplus | Doesn't know who nearby could use it or how to approach them |
| **Surplus-consuming SME** | Compost operator, animal-feed supplier, recycler, biodiesel producer | Find a reliable, cheaper, nearby input source | Local supply is fragmented and hard to discover or verify |
| **Platform operator** | Internal staff reviewing AI output | Keep every AI-generated action explainable and controllable | Needs visibility and audit history without manually brokering every deal |
| **Eco-industrial park / cluster manager** (Phase 2 buyer) | Manages a group of co-located businesses | Demonstrate sustainability outcomes to stakeholders | Needs aggregate reporting across the cluster |

Note: there is **one `business` role**, not separate "buyer" and "seller" roles — the same business can be a source in one match and a target in another, depending on the material. See `schema.md` §2 for how this is modeled.

## 4. Goals and Non-Goals

### Goals
- Discover real, nearby businesses and plausible non-hazardous surplus streams using public data — no enterprise ERP dependency
- Reason about material compatibility beyond keyword matching
- Draft ready-to-send outreach and deal terms for human review
- Track a deal from proposed match through human approval to logistics coordination
- Produce a defensible CO2e-avoided and cost-saved estimate per completed match
- Operate entirely within non-hazardous, non-regulated material categories

### Non-Goals (explicitly out of scope for the foreseeable phases)
- No autonomous outreach — the system never emails or messages a business without a human clicking send
- No autonomous contract signing
- No hazardous or regulated material handling — chemicals, medical waste, e-waste are excluded from the matching engine entirely, not just flagged
- No live freight/logistics automation until Phase 2 — logistics is manual/curated in Phase 1
- No cross-border material movement, at least through Phase 2
- No in-app real-time chat between businesses in Phase 1 — communication happens by email outside the app once outreach is sent (see `architecture.md` §7)

## 5. User Stories

1. As a waste-generating SME, I want to describe or photograph my surplus so the system classifies it without me knowing the technical category myself.
2. As a waste-generating SME, I want to see a proposed match with a clear explanation of *why* it makes sense, so I trust it before agreeing to anything.
3. As a platform operator, I want to review and edit every AI-drafted outreach message before it's sent, so I control tone and accuracy.
4. As a surplus-consuming SME, I want a clear, non-spammy pitch with material quality and proposed terms, so I can evaluate it quickly.
5. As either business, I want a simple, human-readable draft agreement before committing.
6. As a platform operator, I want a dashboard of all matches by status, so I can manage the pipeline.
7. As a cluster manager, I want an aggregate report of savings and CO2e avoided, so I can report sustainability outcomes.
8. As a waste-generating SME, I want confirmation my material was actually reused before any carbon claim is finalized, so the certificate is credible.

## 6. Features

### 6.1 Must-have (Phase 1)
- Surplus intake via text description + photo
- Material classification into the six non-hazardous v1 categories (`schema.md` §5)
- Hard block on hazardous/regulated material, enforced before matching — not just a UI warning
- At least one proposed nearby match with plain-language rationale, confidence, and estimated value
- Human-approved outreach drafting — operator reviews, edits, and sends; no auto-send capability exists
- Deal status tracking through a defined pipeline (`architecture.md` §5)
- Verification requirement before any CO2e-avoided/savings certificate is issued
- Operator dashboard with match status and basic reporting

### 6.2 Should-have (Phase 1, later)
- CSV/manifest upload for businesses with existing waste-tracking spreadsheets
- Iterative multi-round negotiation, human-edited each round
- Simple structured contract draft generation, human-reviewed
- Cluster/park-level aggregate reporting

### 6.3 Could-have (Phase 2+)
- Live hauler API integration for logistics booking
- Confidentiality-preserving match previews (abstracted material description before full disclosure)
- Multi-city/multi-region expansion with region-specific rules
- E-signature integration, still gated on human approval
- Trust-tiered autonomy for repeat business pairs (see `phases.md` §Phase 2)

### 6.4 Won't-have (any phase covered by this PRD)
- Autonomous outreach or contract execution without human approval
- Hazardous, medical, or e-waste material handling
- Cross-border waste movement
- Any feature that removes the human-approval gate on outreach or contracting

## 7. Business Model — Who Actually Pays

Businesses that upload surplus use EcoMatch **for free** in Phase 1 — charging an unproven SME before it's seen a match land creates exactly the friction that kills a cold-start marketplace.

The realistic paying buyer is **whoever is accountable for outcomes across many businesses at once**, not the individual SME:

| Buyer | Why they'd pay |
|---|---|
| Eco-industrial park / SME cluster manager | Brings a whole member base on at once — solves cold-start and revenue in one deal |
| Municipality / economic development body | Waste diversion and local economic activity are funded policy goals |
| Corporate sustainability/ESG teams | Need aggregate CO2e/savings reporting across many sites for disclosures |
| Waste haulers | Pay for lead-generation/routing, similar to a marketplace referral fee |
| Individual SMEs (later) | Fair to charge a transaction fee only *after* they've seen a verified, completed match |

## 8. Success Metrics

| Metric | Phase 1 pilot target |
|---|---|
| Matches proposed per week | Baseline to establish, track trend |
| Match → outreach-sent conversion | ≥ 30% |
| Outreach → agreed-deal conversion | ≥ 15% |
| Time from submission to first proposed match | < 24 hours |
| Verification pass rate | ≥ 90% of completed matches |
| Businesses rating match rationale "clear and trustworthy" | ≥ 80% (survey) |

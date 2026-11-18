# EcoMatch — Product Requirements Document

**See also:** `architecture.md` (system design) · `schema.md` (data model) · `rules.md` (build constraints) · `phases.md` (rollout plan)

> **v2 note:** The original design routed every match and outreach message through an operator for approval before a business ever saw it. That gate has been removed from the critical path. Instead, each business reviews and independently accepts or rejects its own match proposal in-platform, and contact information between the two businesses is never revealed by EcoMatch at all — see §4, §5, and §7 below. The `operator` persona is renamed `admin` and now supervises the marketplace (fraud, quality, disputes, verification, hauler management) rather than gating individual deals.

---

## 1. Executive Summary

EcoMatch is an agentic AI system that discovers, matches, and drafts deals between local businesses that generate non-hazardous surplus material and nearby businesses that can use those materials as inputs. It classifies surplus, reasons about compatible reuse pathways, discovers nearby candidate businesses, and drafts an in-platform proposal for each side — with nothing ever binding until **both businesses themselves** accept it. Contact information between the two businesses is never revealed by the platform; logistics contact flows only through a hauler once both sides have agreed.

> "We find the business nearby that will pay for what you are paying to throw away — and we draft the deal, you just say yes."

## 2. Problem Statement

A business routinely pays disposal fees for material another nearby business would pay to acquire as raw input. This is a "double coincidence of wants" problem: both sides exist, but discovering each other, verifying material compatibility, and negotiating terms is too expensive for a human broker to do at SME scale.

**Pain points:**
- **Discovery failure** — businesses that produce and need compatible materials don't know each other exists
- **Compatibility uncertainty** — real reuse potential goes beyond keyword matching (e.g. brewery wastewater's nitrogen content makes it fertilizer, not just sewage)
- **Broker economics don't work** for small surplus volumes — not enough margin to justify a human broker's time
- **Manual review kills promising matches before they're even seen** — a step where someone has to review and forward a proposed match is itself a bottleneck; EcoMatch removes it by putting the accept/reject decision directly in each business's own hands, gated only by the Alchemist Agent's confidence floor rather than a person's availability
- **No proof of impact** — businesses need evidence material was actually reused before any sustainability claim is credible
- **Disintermediation risk** — if a marketplace reveals both parties' contact info after one successful match, nothing stops them from transacting directly next time and cutting the platform out; EcoMatch avoids this by never revealing contact info between businesses at all (see §7)

## 3. Target Users

| Persona | Who they are | Goal | Frustration |
|---|---|---|---|
| **Waste-generating SME** | Cafe, bakery, print shop, small manufacturer | Reduce disposal cost, ideally earn value from surplus | Doesn't know who nearby could use it or how to approach them |
| **Surplus-consuming SME** | Compost operator, animal-feed supplier, recycler, biodiesel producer | Find a reliable, cheaper, nearby input source | Local supply is fragmented and hard to discover or verify |
| **Platform admin** *(formerly "platform operator")* | Internal staff supervising the marketplace | Verify businesses, catch fraud, monitor AI match quality, manage haulers, resolve disputes, keep an accurate audit trail | Needs visibility and intervention power without being a bottleneck in every individual deal |
| **Eco-industrial park / cluster manager** (Phase 2 buyer) | Manages a group of co-located businesses | Demonstrate sustainability outcomes to stakeholders | Needs aggregate reporting across the cluster |

Note: there is **one `business` role**, not separate "buyer" and "seller" roles — the same business can be a source in one match and a target in another, depending on the material. See `schema.md` §2 for how this is modeled.

## 4. Goals and Non-Goals

### Goals
- Discover real, nearby businesses and plausible non-hazardous surplus streams using public data — no enterprise ERP dependency
- Reason about material compatibility beyond keyword matching
- Draft a ready-to-review in-platform proposal and deal terms for each business to accept or reject itself
- Track a deal from proposed match through both-sided acceptance to logistics coordination
- Produce a defensible CO2e-avoided and cost-saved estimate per completed match
- Operate entirely within non-hazardous, non-regulated material categories
- Never reveal either business's contact information to the other — keep every interaction inside the platform, with contact flowing only through a hauler once logistics is underway

### Non-Goals (explicitly out of scope for the foreseeable phases)
- **No deal is ever binding without both businesses independently accepting it themselves** — the system proposes, it never commits a business to anything
- No autonomous contract signing
- No direct contact reveal between the two businesses in a match, at any phase — see `architecture.md` §7 and `phases.md` §Phase 2
- No hazardous or regulated material handling — chemicals, medical waste, e-waste are excluded from the matching engine entirely, not just flagged
- No live freight/logistics automation until Phase 2 — logistics is manual/curated in Phase 1
- No cross-border material movement, at least through Phase 2
- No in-app real-time chat or counter-offer negotiation in Phase 1 — Accept/Reject only (see `phases.md` §Phase 2 for structured counter-offers as a later item)

## 5. User Stories

1. As a waste-generating SME, I want to describe or photograph my surplus so the system classifies it without me knowing the technical category myself.
2. As a waste-generating SME, I want to see a proposed match with a clear explanation of *why* it makes sense, so I can decide with confidence whether to accept it — with no weak or low-confidence matches ever shown to me in the first place.
3. As a waste-generating or surplus-consuming SME, I want to review a clear, honest, non-spammy in-platform proposal with material quality and terms, and accept or reject it myself, so I stay in control of my own commitments without waiting on anyone else.
4. As a platform admin, I want to verify businesses, monitor match quality and fraud signals, and review the full audit trail, so I can supervise the marketplace without being a bottleneck in every individual deal.
5. As either business, I want a simple, human-readable proposed agreement before committing, and to know nothing is final until I've clicked accept.
6. As a platform admin, I want a dashboard of all matches and disputes by status, so I can manage marketplace health.
7. As a cluster manager, I want an aggregate report of savings and CO2e avoided, so I can report sustainability outcomes.
8. As a waste-generating SME, I want confirmation my material was actually reused before any carbon claim is finalized, so the certificate is credible.

## 6. Features

### 6.1 Must-have (Phase 1)
- Surplus intake via text description + photo
- Material classification into the six non-hazardous v1 categories (`schema.md` §5)
- Hard block on hazardous/regulated material, enforced before matching — not just a UI warning
- Automatic suppression of low-confidence matches (`matchConfidence < 0.7`) — never shown to a business, not flagged for review, since no operator review step exists to catch a weak match
- At least one proposed nearby match with plain-language rationale, confidence, and estimated value, for matches that clear the confidence floor
- In-platform proposal drafting — each business reviews its own side and independently accepts or rejects; no operator approval step, no auto-send to an external inbox, no contact info revealed
- Deal status tracking through a defined pipeline (`architecture.md` §5)
- Verification requirement before any CO2e-avoided/savings certificate is issued
- Admin console: business verification queue, fraud/quality monitoring, hauler management, dispute review, audit log, and basic reporting

### 6.2 Should-have (Phase 1, later)
- CSV/manifest upload for businesses with existing waste-tracking spreadsheets
- Simple structured contract draft generation, still gated on both-sided acceptance
- Cluster/park-level aggregate reporting

### 6.3 Could-have (Phase 2+)
- Live hauler API integration for logistics booking
- Structured in-app counter-offer negotiation (replacing Accept/Reject-only)
- Multi-city/multi-region expansion with region-specific rules
- E-signature integration, still gated on both-sided acceptance
- Trust-tiered autonomy for confidence-floor tuning or logistics steps for repeat business pairs (see `phases.md` §Phase 2) — **not** for revealing contact info, which stays permanently withheld

### 6.4 Won't-have (any phase covered by this PRD)
- Any feature that makes a deal binding without both businesses independently accepting it
- Direct contact reveal between the two businesses in a match, in any phase
- Hazardous, medical, or e-waste material handling
- Cross-border waste movement

## 7. Business Model — Who Actually Pays

Businesses that upload surplus use EcoMatch **for free** in Phase 1 — charging an unproven SME before it's seen a match land creates exactly the friction that kills a cold-start marketplace.

**Never revealing contact information between the two businesses is also a deliberate business-model decision, not just a privacy one:** if EcoMatch handed over both parties' contact details after a successful match, nothing would stop them from transacting directly the next time and cutting the platform out entirely — the classic marketplace disintermediation problem (the reason Upwork and Airbnb work hard to keep contact info inside the platform until a booking is confirmed, and beyond). Keeping contact inside the platform, mediated only through a hauler for logistics, means EcoMatch stays load-bearing for every future transaction between that pair, not just the first one.

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
| Match shown → proposal accepted (both sides) conversion | ≥ 30% |
| Proposal accepted → agreed-deal (logistics scheduled) conversion | ≥ 15% |
| Time from submission to first proposed match | < 24 hours |
| Verification pass rate | ≥ 90% of completed matches |
| Businesses rating match rationale "clear and trustworthy" | ≥ 80% (survey) |
| Suppressed (sub-0.7) match rate | Baseline to establish — informs whether the 0.7 floor is well-calibrated |

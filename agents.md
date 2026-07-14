# EcoMatch — Agents

**See also:** `PRD.md` (features/users) · `architecture.md` (system design) · `rules.md` (build constraints) · `phases.md` (rollout plan) · `schema.md` (data model)

All four agents live inside `ms2-agent-service`, one LangGraph graph per agent, each exposed as one FastAPI endpoint. None of them persist data or send anything — they take structured input, reason, and return structured output. **ms1 owns every side effect** (saving, sending, issuing) — see `architecture.md` §6.

---

## 1. Agent Pipeline at a Glance

```
submission ──► Scout Agent ──► hazard check ──► Alchemist Agent ──► operator review
                                                                          │
                                                                          ▼
certificate ◄── Verification Agent ◄── both sides verify ◄── deal agreed ◄── Negotiator Agent ◄── operator approves
```

Each arrow into an agent is one ms1 → ms2 call. Each agent is stateless between calls — all state (what stage a deal is in, who approved what) lives in ms1's database, not in ms2. This means any agent can be re-run safely without side effects; retries are always safe.

---

## 2. Scout Agent — Material Classification

**Endpoint:** `POST /classify`
**Triggered by:** ms1, immediately after a `submission` is created
**Purpose:** turn a messy text/photo submission into a structured classification, and make the hazard determination — the single most safety-critical output in the whole system.

### Internal steps (LangGraph nodes)

1. **`parse_input`** — normalize the raw text description and any photo references into one unified representation the classifier can reason over.
2. **`classify_category`** — LLM call (with vision, if a photo is present) against the six allowed categories in `schema.md` §4. The model is never asked "what is this," it's asked "which of these six categories, if any, does this match" — a closed-set classification, not open-ended guessing.
3. **`estimate_composition`** — where relevant (e.g. organic biomass), estimate rough composition (nitrogen/carbon %, moisture) — this feeds the Alchemist Agent's reasoning later.
4. **`compute_confidence`** — a confidence score based on model certainty and, if both a photo and text were provided, agreement between the two signals.
5. **`hazard_check`** — deterministic, not model-judged: if the classified category is not one of the six allowed categories, `hazard_flag = true`, full stop, regardless of confidence. If the model is uncertain whether something fits, that uncertainty itself resolves to `hazard_flag = true` — **fail-safe, not fail-open**.
6. **`followup_decision`** — conditional: if `confidence < 0.7` and no follow-up has been asked yet this submission, generate exactly one clarifying question. Never loop past one follow-up round.

### Input / Output

```
in:  { submissionId, rawDescription, photoRefs, disposalCostPerUnit, disposalFrequency }
out: { primaryCategory, subtype, estimatedComposition, confidence, hazardFlag,
       needsFollowup, followupQuestion? }
```

### Failure handling

If the LLM returns malformed output, retry once with a stricter format instruction. If it still fails, return a low-confidence result with `hazardFlag = true` — when the system can't tell what something is, it treats it as unsupported rather than risking a false negative on safety.

### Must never do
- Classify into a category outside the six allowed ones
- Skip the `hazard_check` node, even at high confidence
- Ask more than one follow-up question

---

## 3. Alchemist Agent — Compatibility Matching

**Endpoint:** `POST /match`
**Triggered by:** ms1, after a classification passes the hazard check
**Purpose:** find a plausible nearby business match and explain *why*, grounded in real reference data — not a keyword match, not an ungrounded model guess.

### Internal steps

1. **`retrieve_reference_pairings`** — look up the classified category in `reference_data/` for known compatible business types (e.g. `organic_biomass` → compost operations, mushroom farms, biogas plants). This retrieval happens **before** any rationale is generated — the model reasons from retrieved facts, it doesn't invent the compatibility itself.
2. **`discover_nearby_candidates`** — query businesses of a compatible type within a reasonable radius of the source business's `lat`/`lng`.
3. **`score_candidates`** — rank by distance, estimated economic value, and (once real pilot data exists) historical match success rate for that business-type pairing.
4. **`generate_rationale`** — LLM call to write the plain-language explanation a business owner will actually read, constrained to reference only what was retrieved in step 1 — the model is drafting the sentence, not inventing the chemistry.
5. **`estimate_value`** — compute `estimated_source_savings` (vs. the submission's disposal cost) and `estimated_target_savings_pct` (vs. a reference market price in `reference_data/`).

### Input / Output

```
in:  { classification, sourceBusinessLocation, sourceBusinessType }
out: { targetBusinessId, matchRationale, matchConfidence, distanceKm,
       estimatedSourceSavings, estimatedTargetSavingsPct }
```

### Confidence handling
- `matchConfidence < 0.3` → treated as no usable match; ms1 shows "no match found yet," nothing is created
- `0.3 ≤ matchConfidence < 0.5` → returned, but flagged `lowConfidence: true` so the operator review screen visually calls it out for extra scrutiny
- `matchConfidence ≥ 0.5` → returned normally

### Failure handling
No candidates in radius → return an explicit `no_candidates_in_radius` reason, not an empty/ambiguous response, so ms1 and the frontend can show a clear "no match found yet" state instead of looking broken.

### Must never do
- Reference a business that doesn't exist in the database
- Generate a compatibility rationale without first completing `retrieve_reference_pairings`

---

## 4. Negotiator Agent — Outreach Drafting

**Endpoint:** `POST /draft`
**Triggered by:** ms1, only after an operator has approved a match
**Purpose:** draft two outreach messages and proposed terms — nothing more. This agent has no send capability anywhere in its code path; that's enforced by ms1 owning the send action entirely, not by this agent choosing not to.

### Internal steps

1. **`determine_terms`** — compute proposed price/unit (undercutting the source's current disposal fee by a configurable margin), frequency, and default contract length, from `reference_data/` defaults, not invented per-call.
2. **`draft_source_message`** — LLM call with a tone-controlled system prompt: warm, specific, no pressure tactics, no language implying the deal is already confirmed. This is deliberately the opposite of an aggressive sales tone — see `PRD.md` for why (cold outreach to a stranger reads as spam fast if it's pushy).
3. **`draft_target_message`** — same, personalized to the target business.
4. **`self_check_tone`** — a second pass (rule-based checklist, not necessarily another full LLM call) verifying the draft doesn't overpromise, doesn't state binding commitments, and clearly reads as a proposal, not a confirmation.

### Input / Output

```
in:  { match, sourceBusiness, targetBusiness }
out: { sourceDraft: { message, terms }, targetDraft: { message, terms } }
```

### Failure handling
If a draft fails the tone self-check, regenerate once with stricter constraints. Cap at two attempts total — if still failing, return the best-effort draft with a flag so the operator knows to rewrite it manually rather than looping indefinitely.

### Must never do
- Send anything — this agent only returns drafts, ever (`rules.md` §4.2)
- Imply the deal is confirmed or binding in either draft

---

## 5. Verification Agent — Impact Calculation

**Endpoint:** `POST /verify`
**Triggered by:** ms1, only after both `verification_records` for a match are `confirmed = true`
**Purpose:** calculate a defensible CO2e-avoided and dollars-saved figure — the number that goes on the certificate.

### Internal steps

1. **`validate_evidence_presence`** — a defensive re-check that both verification records actually exist and are confirmed, even though ms1 already gates this call. Never trust the caller blindly on a step this consequential.
2. **`compute_co2e_avoided`** — apply a cited emission-factor methodology (e.g. EPA WARM model factors) based on material category and estimated volume.
3. **`compute_dollars_saved`** — based on the actual agreed terms vs. the original disposal cost recorded on the submission.
4. **`cite_methodology`** — attach a methodology reference string to the output so the certificate is auditable, not just an asserted number.

### Input / Output

```
in:  { matchId, verificationEvidenceRefs, disposalCostPerUnit, volumeEstimate }
out: { co2eAvoidedKg, dollarsSaved, methodologyReference }
```

### Failure handling
If volume data is missing or unreliable, return a conservative estimated range and flag it as `estimated: true` rather than fabricating a precise-looking number. A certificate should never claim more precision than the underlying data supports.

### Must never do
- Invent an emission factor that isn't in `reference_data/`
- Run its calculation if either verification record isn't actually confirmed, even if ms1's gate is assumed to have already checked

---

## 6. Orchestration Pattern

Each agent is one compiled LangGraph `StateGraph`, built once at service startup and invoked per request:

- **Typed state** — each graph's state shape matches its input/output schema above; don't pass loosely-typed dicts between nodes.
- **Conditional edges** for branching (hazard check outcome, follow-up needed, retry-on-failure) — keep these simple. Don't add loops or branches beyond what's documented above without a clear reason; this is a Phase 1 system, not a research project.
- **No shared state between graphs** — the Scout Agent's graph and the Alchemist Agent's graph don't call each other directly; ms1 sequences them by making two separate HTTP calls. This keeps each agent independently testable and debuggable.

## 7. Confidence Thresholds (starting defaults — tune once real pilot data exists)

| Agent | Threshold | Behavior |
|---|---|---|
| Scout | confidence < 0.7 | trigger one follow-up question |
| Alchemist | confidence < 0.3 | no match returned |
| Alchemist | 0.3 ≤ confidence < 0.5 | returned, flagged `lowConfidence` for operator |
| Negotiator | tone self-check fails twice | return best-effort draft, flagged for manual rewrite |

These numbers are defaults, not settled science — see `phases.md` Phase 1 pilot exit checklist for where real calibration data should come from before adjusting them.

## 8. Testing Agents Locally

Every agent endpoint should have sample payloads in `ms2-agent-service/tests/fixtures/` covering: a clean high-confidence case, a low-confidence case, a hazardous-category case, and a malformed-input case. ms1 can mock against these same fixtures while ms2 is still being built in parallel — see the Phase 1a local setup prompts for how this fits into independent service development.

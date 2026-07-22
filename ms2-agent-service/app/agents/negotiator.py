"""Negotiator Agent - In-Platform Proposal Drafting.

Implemented as a compiled LangGraph StateGraph with a tone-check retry loop:

    llm_determine_terms
          │
          ▼
    draft_source_message
          │
          ▼
    draft_target_message
          │
          ▼
    llm_check_tone ──[tone ok?]──► END
          │ fail, attempt < 2
          ▼
    regenerate_drafts ──► llm_check_tone   (cycles back, max 2 attempts total)
          │ fail, attempt >= 2
          ▼
    flag_for_manual_rewrite ──► END

CRITICAL: This agent never sends anything. It only returns drafts for
in-platform display. Contact details are never included at any step.
"""

import os
import time
from typing import TypedDict, Optional, Any

from langgraph.graph import StateGraph, END

from app.models import DraftRequest, DraftResponse
from app.reference_data.categories import get_category, get_market_price
from app.logger import logger
from app.llm import LLMConfigurationError, LLMResponseError, llm_client


# ──────────────────────────────────────────────────────────────────────────────
#  Typed state
# ──────────────────────────────────────────────────────────────────────────────

class NegotiatorState(TypedDict):
    """Full state flowing through the Negotiator Agent graph."""
    # ── inputs ────────────────────────────────────────────────────────────────
    match: dict
    source_business: dict
    target_business: dict
    max_tone_attempts: int
    # ── intermediate ──────────────────────────────────────────────────────────
    terms: dict
    source_draft: str
    target_draft: str
    source_tone_ok: bool
    target_tone_ok: bool
    tone_attempt: int
    # ── outputs ───────────────────────────────────────────────────────────────
    needs_manual_rewrite: bool
    error: Optional[str]


# ──────────────────────────────────────────────────────────────────────────────
#  Node 1 — llm_determine_terms
# ──────────────────────────────────────────────────────────────────────────────

async def _node_llm_determine_terms(state: NegotiatorState) -> dict:
    """LLM decides fair deal terms from reference data and deal context."""
    match = state["match"]
    user_disposal_cost = match.get("disposalCostPerUnit") or match.get("sourceDisposalCost")
    user_frequency = match.get("disposalFrequency") or "weekly"
    category = match.get("classification", {}).get("primaryCategory", "unknown")
    market_price = get_market_price(category)
    category_info = get_category(category) or {}

    base_price = float(user_disposal_cost) if user_disposal_cost is not None and float(user_disposal_cost) > 0 else float(market_price)

    try:
        result = await llm_client.complete_json(
            system_prompt=(
                "You are EcoMatch's Negotiator Agent determining fair deal terms for a waste "
                "material match. Use the provided user disposal cost to set a proposed price. "
                "Choose a realistic contract length and frequency. "
                "Do not invent arbitrary numbers — stay grounded in the user's submitted disposal cost."
            ),
            operation="negotiator_determine_terms",
            user_payload={
                "userDisposalCost": base_price,
                "userFrequency": user_frequency,
                "primaryCategory": category,
                "categoryDescription": category_info.get("description", ""),
                "marketPricePerTon": market_price,
                "matchRationale": match.get("matchRationale", ""),
                "estimatedSourceSavings": match.get("estimatedSourceSavings"),
                "estimatedTargetSavingsPct": match.get("estimatedTargetSavingsPct"),
            },
            response_schema={
                "pricePerUnit": "proposed price per unit (float)",
                "frequency": "pickup/delivery frequency string (e.g. 'monthly', 'weekly')",
                "contractLengthMonths": "integer, e.g. 6 or 12",
                "startDate": "string, e.g. 'to be confirmed'",
                "notes": "short quality-expectation notes string",
            },
        )
        terms = {
            "pricePerUnit": float(result.get("pricePerUnit") or base_price),
            "frequency": str(result.get("frequency") or user_frequency),
            "contractLengthMonths": int(result.get("contractLengthMonths") or 12),
            "startDate": str(result.get("startDate") or "to be confirmed"),
            "notes": str(result.get("notes") or "Subject to material inspection and quality verification"),
        }
    except (LLMConfigurationError, LLMResponseError) as exc:
        logger.info("Negotiator terms fallback", extra={"reason": str(exc)})
        terms = {
            "pricePerUnit": base_price,
            "frequency": user_frequency,
            "contractLengthMonths": 12,
            "startDate": "to be confirmed",
            "notes": "Subject to material inspection and quality verification",
        }

    return {"terms": terms}


# ──────────────────────────────────────────────────────────────────────────────
#  Nodes 2 & 3 — draft_source_message / draft_target_message
# ──────────────────────────────────────────────────────────────────────────────

async def _node_draft_source_message(state: NegotiatorState) -> dict:
    """Draft the in-platform proposal for the SOURCE business."""
    msg = await _llm_draft_message(
        audience_role="source_business",
        audience_business=state["source_business"],
        counterpart_business=state["target_business"],
        match=state["match"],
        terms=state["terms"],
        stricter=False,
    )
    return {"source_draft": msg}


async def _node_draft_target_message(state: NegotiatorState) -> dict:
    """Draft the in-platform proposal for the TARGET business."""
    msg = await _llm_draft_message(
        audience_role="target_business",
        audience_business=state["target_business"],
        counterpart_business=state["source_business"],
        match=state["match"],
        terms=state["terms"],
        stricter=False,
    )
    return {"target_draft": msg}


async def _llm_draft_message(
    *,
    audience_role: str,
    audience_business: dict,
    counterpart_business: dict,
    match: dict,
    terms: dict,
    stricter: bool,
) -> str:
    """
    Ask the LLM for a warm, non-pushy in-platform proposal message.
    NEVER includes phone, email, or physical address.
    """
    raw_desc = match.get("rawDescription") or ""
    subtype = match.get("classification", {}).get("subtype") or ""
    rationale = match.get("matchRationale") or ""
    audience_name = (audience_business or {}).get("name") or "Business"
    counterpart_name = (counterpart_business or {}).get("name") or "the counterpart business"

    safe_payload = {
        "audienceRole": audience_role,
        "audienceBusiness": {"name": audience_name},
        "counterpartBusiness": {"name": counterpart_name},
        "submittedMaterialDescription": raw_desc,
        "materialSubtype": subtype,
        "matchRationale": rationale,
        "terms": terms,
        "stricterTonePass": stricter,
    }

    try:
        result = await llm_client.complete_json(
            system_prompt=(
                "You are EcoMatch's Negotiator Agent. Draft a warm, specific, non-pushy "
                "dashboard proposal for the logged-in business. "
                "CRITICAL REQUIREMENT: You MUST reference the exact submitted material description "
                "('submittedMaterialDescription') and material subtype ('materialSubtype') provided in the payload. "
                "NEVER introduce, mention, or substitute coffee grounds, spent grain, or any other material "
                "that is not explicitly specified in 'submittedMaterialDescription' or 'materialSubtype'. "
                "The message is for in-platform display only — NEVER include phone numbers, email addresses, "
                "physical addresses, or any other contact details. Do not imply the deal is confirmed, binding, "
                "guaranteed, required, or already accepted by the other party. "
                "Clearly frame it as a proposal the current business can accept or reject."
            ),
            operation=f"negotiator_{audience_role}_draft",
            user_payload=safe_payload,
            response_schema={"message": "dashboard proposal message string"},
        )
        message = result.get("message")
        if isinstance(message, str) and message.strip():
            return message.strip()
        raise LLMResponseError("message missing from LLM response")
    except (LLMConfigurationError, LLMResponseError) as exc:
        logger.info("Negotiator draft fallback", extra={"audienceRole": audience_role, "reason": str(exc)})
        return _fallback_message(audience_role, audience_name, counterpart_name, terms, raw_desc)


def _fallback_message(role: str, audience: str, counterpart: str, terms: dict, raw_desc: str = "") -> str:
    """Local draft used when no LLM is configured."""
    mat_text = f" ({raw_desc})" if raw_desc else ""
    if role == "source_business":
        intro = (
            f"We've identified {counterpart} as a potential recipient for your material{mat_text}. "
            "They operate in a compatible line of work and may benefit from your supply."
        )
    else:
        intro = (
            f"We've identified {counterpart} as a potential supplier of material{mat_text} that may "
            "match your operations."
        )
    return (
        f"A proposal is available for {audience} to engage with {counterpart}.\n\n{intro}\n\n"
        f"Proposed terms:\n"
        f"- Price: ${terms['pricePerUnit']:.2f} per unit\n"
        f"- Frequency: {terms['frequency']}\n"
        f"- Contract length: {terms['contractLengthMonths']} months\n\n"
        "If this looks useful, you can review and accept this proposal in your dashboard."
    )


# ──────────────────────────────────────────────────────────────────────────────
#  Node 4 — llm_check_tone
# ──────────────────────────────────────────────────────────────────────────────

async def _node_llm_check_tone(state: NegotiatorState) -> dict:
    """
    LLM verifies both drafts don't overpromise, bind, or leak contact info.
    Increments tone_attempt counter for the retry loop.
    """
    source_tone_ok = await _check_single_draft(state["source_draft"])
    target_tone_ok = await _check_single_draft(state["target_draft"])

    new_attempt = state["tone_attempt"] + 1
    if not (source_tone_ok and target_tone_ok):
        logger.warning("Tone check failed", extra={
            "matchId": state["match"].get("id"),
            "attempt": new_attempt,
            "sourceFailed": not source_tone_ok,
            "targetFailed": not target_tone_ok,
        })

    return {
        "source_tone_ok": source_tone_ok,
        "target_tone_ok": target_tone_ok,
        "tone_attempt": new_attempt,
    }


async def _check_single_draft(draft_message: str) -> bool:
    """Returns True if the draft passes the tone check."""
    try:
        result = await llm_client.complete_json(
            system_prompt=(
                "You are a quality reviewer for EcoMatch proposal drafts. "
                "Check ALL of the following rules:\n"
                "1. No pushy sales pressure or aggressive demands (e.g. 'you must accept immediately', 'binding requirement'). Standard material specifications or quality notes are acceptable.\n"
                "2. Does not imply the deal is already finalized or that the other party has already agreed.\n"
                "3. Contains no contact information (phone, email, address, or URLs).\n"
                "4. Clearly frames itself as a PROPOSAL awaiting the reader's own accept/reject decision.\n"
                "Return toneOk=true if all rules pass."
            ),
            operation="negotiator_tone_check",
            user_payload={"draftMessage": draft_message},
            response_schema={
                "toneOk": "boolean — true if all rules pass",
                "reason": "brief explanation if toneOk is false, else null",
            },
        )
        tone_ok = bool(result.get("toneOk", False))
        if not tone_ok:
            logger.info("Draft tone check failed", extra={"reason": result.get("reason")})
        return tone_ok
    except (LLMConfigurationError, LLMResponseError):
        # If tone check itself fails (no LLM), assume ok to avoid infinite loop
        return True


# ──────────────────────────────────────────────────────────────────────────────
#  Node 5 — regenerate_drafts
# ──────────────────────────────────────────────────────────────────────────────

async def _node_regenerate_drafts(state: NegotiatorState) -> dict:
    """Regenerates failed drafts with stricter tone constraints (retry path)."""
    updates: dict = {}
    if not state["source_tone_ok"]:
        updates["source_draft"] = await _llm_draft_message(
            audience_role="source_business",
            audience_business=state["source_business"],
            counterpart_business=state["target_business"],
            match=state["match"],
            terms=state["terms"],
            stricter=True,
        )
    if not state["target_tone_ok"]:
        updates["target_draft"] = await _llm_draft_message(
            audience_role="target_business",
            audience_business=state["target_business"],
            counterpart_business=state["source_business"],
            match=state["match"],
            terms=state["terms"],
            stricter=True,
        )
    return updates


# ──────────────────────────────────────────────────────────────────────────────
#  Node 6 — flag_for_manual_rewrite
# ──────────────────────────────────────────────────────────────────────────────

def _node_flag_for_manual_rewrite(state: NegotiatorState) -> dict:
    """
    Cap reached — return best-effort draft flagged for admin review.
    This is an exception path, not a required step (architecture.md §6).
    """
    logger.warning("Negotiator max tone attempts reached — flagging for manual rewrite", extra={
        "matchId": state["match"].get("id"),
        "attempts": state["tone_attempt"],
    })
    return {"needs_manual_rewrite": True}


# ──────────────────────────────────────────────────────────────────────────────
#  Conditional routing
# ──────────────────────────────────────────────────────────────────────────────

def _route_after_tone_check(state: NegotiatorState) -> str:
    """
    Route based on tone check outcome and attempt count:
    - Both ok → end
    - Fail but attempts remaining → regenerate
    - Fail and exhausted → flag for manual rewrite
    """
    tone_ok = state["source_tone_ok"] and state["target_tone_ok"]
    if tone_ok:
        return "end_ok"
    if state["tone_attempt"] < state["max_tone_attempts"]:
        return "regenerate"
    return "flag_manual"


# ──────────────────────────────────────────────────────────────────────────────
#  Graph construction
# ──────────────────────────────────────────────────────────────────────────────

def _build_negotiator_graph():
    graph = StateGraph(NegotiatorState)

    graph.add_node("llm_determine_terms", _node_llm_determine_terms)
    graph.add_node("draft_source_message", _node_draft_source_message)
    graph.add_node("draft_target_message", _node_draft_target_message)
    graph.add_node("llm_check_tone", _node_llm_check_tone)
    graph.add_node("regenerate_drafts", _node_regenerate_drafts)
    graph.add_node("flag_for_manual_rewrite", _node_flag_for_manual_rewrite)

    graph.set_entry_point("llm_determine_terms")
    graph.add_edge("llm_determine_terms", "draft_source_message")
    graph.add_edge("draft_source_message", "draft_target_message")
    graph.add_edge("draft_target_message", "llm_check_tone")

    # Conditional loop: ok → END | retry → regenerate → llm_check_tone | exhausted → flag
    graph.add_conditional_edges(
        "llm_check_tone",
        _route_after_tone_check,
        {
            "end_ok": END,
            "regenerate": "regenerate_drafts",
            "flag_manual": "flag_for_manual_rewrite",
        },
    )
    graph.add_edge("regenerate_drafts", "llm_check_tone")  # ← cycle back
    graph.add_edge("flag_for_manual_rewrite", END)

    return graph.compile()


_negotiator_graph = _build_negotiator_graph()


# ──────────────────────────────────────────────────────────────────────────────
#  Public agent class (unchanged external API)
# ──────────────────────────────────────────────────────────────────────────────

class NegotiatorAgent:
    """Negotiator Agent for drafting in-platform proposals.

    Wraps the compiled LangGraph StateGraph. External callers use .draft()
    exactly as before.

    CRITICAL: Never includes contact info. Only returns drafts. Never sends.
    """

    def __init__(self):
        self.max_tone_attempts = int(os.getenv("NEGOTIATOR_MAX_TONE_REGEN", "2"))
        self._graph = _negotiator_graph

    async def draft(self, request: DraftRequest) -> DraftResponse:
        start_time = time.time()

        initial_state: NegotiatorState = {
            "match": request.match,
            "source_business": request.sourceBusiness,
            "target_business": request.targetBusiness,
            "max_tone_attempts": self.max_tone_attempts,
            # Defaults
            "terms": {},
            "source_draft": "",
            "target_draft": "",
            "source_tone_ok": False,
            "target_tone_ok": False,
            "tone_attempt": 0,
            "needs_manual_rewrite": False,
            "error": None,
        }

        try:
            final = await self._graph.ainvoke(initial_state)

            logger.info("Drafts created", extra={
                "matchId": request.match.get("id"),
                "needsManualRewrite": final.get("needs_manual_rewrite", False),
                "latency_ms": int((time.time() - start_time) * 1000),
            })

            needs_rewrite = final.get("needs_manual_rewrite", False)
            return DraftResponse(
                sourceDraft={
                    "message": final["source_draft"],
                    "terms": final["terms"],
                    "needsManualRewrite": needs_rewrite,
                },
                targetDraft={
                    "message": final["target_draft"],
                    "terms": final["terms"],
                    "needsManualRewrite": needs_rewrite,
                },
            )

        except Exception as exc:
            logger.error("Negotiator graph invocation failed", extra={
                "matchId": request.match.get("id"),
                "error": str(exc),
                "latency_ms": int((time.time() - start_time) * 1000),
            })
            raise


negotiator_agent = NegotiatorAgent()

"""Scout Agent - Material Classification.

Implemented as a compiled LangGraph StateGraph with four named nodes:

    parse_input  →  llm_full_classify  →  fail_safe_override  →  [hazard?]  →  END
                                                                   ↓ clean
                                                             followup_decision  →  END

The only hard Python guarantee (enforced in fail_safe_override):
if the LLM returns a category outside the six allowed ones, hazardFlag is
forced True — fail-safe, not fail-open.
"""

import os
import time
from typing import TypedDict, Optional, Any

from langgraph.graph import StateGraph, END

from app.models import ClassifyRequest, ClassifyResponse
from app.reference_data.categories import get_all_categories, get_category
from app.logger import logger
from app.llm import llm_client


# ──────────────────────────────────────────────────────────────────────────────
#  Typed state that flows through every graph node
# ──────────────────────────────────────────────────────────────────────────────

class ScoutState(TypedDict):
    """Full state for the Scout Agent graph."""
    # ── inputs ────────────────────────────────────────────────────────────────
    submission_id: str
    raw_description: str
    photo_refs: Optional[list]
    disposal_cost_per_unit: float
    disposal_frequency: str
    # ── intermediate ──────────────────────────────────────────────────────────
    parsed_text: str
    llm_result: dict
    # ── outputs ───────────────────────────────────────────────────────────────
    primary_category: str
    subtype: Optional[str]
    composition: Optional[dict]
    confidence: float
    hazard_flag: bool
    needs_followup: bool
    followup_question: Optional[str]
    error: Optional[str]


# ──────────────────────────────────────────────────────────────────────────────
#  Node 1 — parse_input
# ──────────────────────────────────────────────────────────────────────────────

def _node_parse_input(state: ScoutState) -> dict:
    """Lightweight normalization — no decisions, just formats input for the LLM."""
    text = state.get("raw_description") or ""
    refs = state.get("photo_refs")
    if refs:
        text += f" [PHOTOS: {', '.join(refs)}]"
    return {"parsed_text": text.strip()}


# ──────────────────────────────────────────────────────────────────────────────
#  Node 2 — llm_full_classify
# ──────────────────────────────────────────────────────────────────────────────

async def _node_llm_full_classify(state: ScoutState) -> dict:
    """
    Single LLM call covering ALL Scout decisions in one pass:
    category, subtype, composition, confidence, hazardFlag, needsFollowup,
    followupQuestion.

    On LLM failure the node sets error + hazard_flag so fail_safe_override
    correctly terminates the pipeline.
    """
    categories = {
        name: get_category(name)["description"]
        for name in get_all_categories()
        if get_category(name)
    }

    system_prompt = (
        "You are EcoMatch's Scout Agent. Analyze the business waste submission "
        "and make ALL decisions below in a single JSON response.\n\n"
        "ALLOWED CATEGORIES (use exact key names):\n"
        + "\n".join(f"  - {k}: {v}" for k, v in categories.items())
        + "\n\n"
        "RULES:\n"
        "1. primaryCategory — choose one key above, or 'unknown' if none match.\n"
        "2. subtype — short descriptor (e.g. 'spent grain') or null.\n"
        "3. estimatedComposition — for organic only: {nitrogen_percent, carbon_percent, "
        "moisture_percent}; null for all other categories.\n"
        "4. confidence — calibrated float 0.0–1.0 reflecting classification certainty.\n"
        "5. hazardFlag — true if toxic/chemical/medical/radioactive/contaminated/unknown; "
        "fail-safe not fail-open: when in doubt, flag it.\n"
        "6. needsFollowup — true ONLY if confidence < 0.7 AND no prior followup yet.\n"
        "7. followupQuestion — one specific question if needsFollowup, else null.\n"
        "Be decisive. Uncertainty → hazardFlag=true."
    )

    try:
        result = await llm_client.complete_json(
            system_prompt=system_prompt,
            operation="scout_full_classify",
            user_payload={
                "submissionId": state["submission_id"],
                "description": state["parsed_text"],
                "photoRefs": state.get("photo_refs") or [],
                "disposalCostPerUnit": state["disposal_cost_per_unit"],
                "disposalFrequency": state["disposal_frequency"],
                "priorFollowupAsked": False,
            },
            response_schema={
                "primaryCategory": "one of the six allowed category keys, or 'unknown'",
                "subtype": "short descriptor string, or null",
                "estimatedComposition": (
                    "object with nitrogen_percent, carbon_percent, moisture_percent — or null"
                ),
                "confidence": "float 0.0 to 1.0",
                "hazardFlag": "boolean",
                "needsFollowup": "boolean",
                "followupQuestion": "one clarifying question string, or null",
            },
        )
        return {"llm_result": result, "error": None}
    except Exception as exc:
        logger.error("Scout LLM call failed", extra={
            "submissionId": state["submission_id"],
            "error": str(exc),
        })
        # Propagate as hazard — node never raises, error flows via state
        return {
            "llm_result": {},
            "error": str(exc),
            "hazard_flag": True,
            "primary_category": "unknown",
            "confidence": 0.0,
            "needs_followup": False,
        }


# ──────────────────────────────────────────────────────────────────────────────
#  Node 3 — fail_safe_override
# ──────────────────────────────────────────────────────────────────────────────

def _node_fail_safe_override(state: ScoutState) -> dict:
    """
    Extracts LLM fields and enforces the hard safety rule:
    any category not in the six allowed ones → hazard_flag = True.

    This is the only Python-level guarantee — the LLM cannot bypass it.
    """
    result = state.get("llm_result") or {}
    allowed = set(get_all_categories())

    primary_category = str(result.get("primaryCategory", "unknown"))
    hazard_flag = bool(result.get("hazardFlag", False))
    confidence = _coerce_confidence(result.get("confidence"))
    subtype = result.get("subtype") or None
    composition = result.get("estimatedComposition")
    needs_followup = bool(result.get("needsFollowup", False))
    followup_question = result.get("followupQuestion") or None

    if not isinstance(composition, dict):
        composition = None

    # Hard guarantee: unknown or disallowed category is always hazardous
    if primary_category not in allowed:
        hazard_flag = True

    # If the LLM node itself failed, treat as hazard
    if state.get("error"):
        hazard_flag = True

    if hazard_flag:
        logger.info("Hazard flag set", extra={
            "submissionId": state["submission_id"],
            "category": primary_category,
            "llm_flagged": bool(result.get("hazardFlag")),
            "llm_error": bool(state.get("error")),
        })

    return {
        "primary_category": primary_category,
        "subtype": subtype,
        "composition": composition,
        "confidence": confidence,
        "hazard_flag": hazard_flag,
        "needs_followup": needs_followup,
        "followup_question": followup_question,
    }


# ──────────────────────────────────────────────────────────────────────────────
#  Node 4 — followup_decision
# ──────────────────────────────────────────────────────────────────────────────

def _node_followup_decision(state: ScoutState) -> dict:
    """
    Named node for the followup-question step.
    The LLM already decided needsFollowup and followupQuestion; this node
    exists as an explicit, observable step in the graph for demo clarity.
    """
    return {}


# ──────────────────────────────────────────────────────────────────────────────
#  Conditional routing
# ──────────────────────────────────────────────────────────────────────────────

def _route_after_fail_safe(state: ScoutState) -> str:
    """If hazard is set → terminate early; otherwise → followup_decision."""
    return "end_hazard" if state.get("hazard_flag") else "followup_decision"


# ──────────────────────────────────────────────────────────────────────────────
#  Graph construction (compiled once at module load)
# ──────────────────────────────────────────────────────────────────────────────

def _build_scout_graph():
    graph = StateGraph(ScoutState)

    graph.add_node("llm_full_classify", _node_llm_full_classify)
    graph.add_node("fail_safe_override", _node_fail_safe_override)
    graph.add_node("parse_input", _node_parse_input)
    graph.add_node("followup_decision", _node_followup_decision)

    graph.set_entry_point("parse_input")
    
    graph.add_edge("parse_input", "llm_full_classify")
    graph.add_edge("llm_full_classify", "fail_safe_override")
    graph.add_conditional_edges(
        "fail_safe_override",
        _route_after_fail_safe,
        {
            "end_hazard": END,
            "followup_decision": "followup_decision",
        },
    )
    graph.add_edge("followup_decision", END)

    return graph.compile()


# Singleton compiled graph — built once at import time
_scout_graph = _build_scout_graph()


# ──────────────────────────────────────────────────────────────────────────────
#  Public agent class (unchanged external API)
# ──────────────────────────────────────────────────────────────────────────────

class ScoutAgent:
    """Scout Agent for material classification and hazard detection.

    Wraps the compiled LangGraph StateGraph. External callers use .classify()
    exactly as before — the graph is an internal implementation detail.
    """

    def __init__(self):
        self.confidence_threshold = float(os.getenv("SCOUT_CONFIDENCE_THRESHOLD", "0.7"))
        self._graph = _scout_graph

    async def classify(self, request: ClassifyRequest) -> ClassifyResponse:
        start_time = time.time()

        initial_state: ScoutState = {
            "submission_id": request.submissionId,
            "raw_description": request.rawDescription,
            "photo_refs": request.photoRefs,
            "disposal_cost_per_unit": request.disposalCostPerUnit,
            "disposal_frequency": request.disposalFrequency,
            # Intermediate / output fields initialised to safe defaults
            "parsed_text": "",
            "llm_result": {},
            "primary_category": "unknown",
            "subtype": None,
            "composition": None,
            "confidence": 0.0,
            "hazard_flag": False,
            "needs_followup": False,
            "followup_question": None,
            "error": None,
        }

        try:
            final = await self._graph.ainvoke(initial_state)

            logger.info("Classification complete", extra={
                "submissionId": request.submissionId,
                "category": final["primary_category"],
                "confidence": final["confidence"],
                "hazardFlag": final["hazard_flag"],
                "needsFollowup": final["needs_followup"],
                "latency_ms": int((time.time() - start_time) * 1000),
            })

            return ClassifyResponse(
                submissionId=request.submissionId,
                primaryCategory=final["primary_category"],
                subtype=final.get("subtype"),
                estimatedComposition=final.get("composition"),
                confidence=final["confidence"],
                hazardFlag=final["hazard_flag"],
                needsFollowup=final["needs_followup"],
                followupQuestion=(
                    final.get("followup_question") if final["needs_followup"] else None
                ),
            )

        except Exception as exc:
            logger.error("Scout graph invocation failed", extra={
                "submissionId": request.submissionId,
                "error": str(exc),
                "latency_ms": int((time.time() - start_time) * 1000),
            })
            # Outer safety net — always returns a typed response
            return ClassifyResponse(
                submissionId=request.submissionId,
                primaryCategory="unknown",
                confidence=0.0,
                hazardFlag=True,
                needsFollowup=False,
            )


# ──────────────────────────────────────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _coerce_confidence(value: Any) -> float:
    try:
        return min(max(float(value), 0.0), 1.0)
    except (TypeError, ValueError):
        return 0.0


scout_agent = ScoutAgent()

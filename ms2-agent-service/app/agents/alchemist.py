"""Alchemist Agent - Compatibility Matching.

Implemented as a compiled LangGraph StateGraph with four named nodes and
two conditional early-exit paths:

    retrieve_reference_pairings ──[no compatible types?]──► END (suppressed)
              │
              ▼
    discover_nearby_candidates ──[no candidates in radius?]──► END (suppressed)
              │
              ▼
    llm_score_and_match
              │
              ▼
    confidence_gate ──[matchConfidence < 0.7?]──► END (suppressed)
              │
              ▼ >= 0.7
             END (returned)

The Python-enforced safety guarantee: matchConfidence < 0.7 is ALWAYS
suppressed — no match row is ever created from a weak result.
"""

import os
import math
import time
from typing import TypedDict, Optional, Any

from langgraph.graph import StateGraph, END

from app.models import MatchRequest, MatchResponse
from app.reference_data.categories import (
    get_compatible_business_types,
    get_market_price,
    get_category,
)
from app.logger import logger
from app.llm import llm_client


# ──────────────────────────────────────────────────────────────────────────────
#  Typed state
# ──────────────────────────────────────────────────────────────────────────────

class AlchemistState(TypedDict):
    """Full state flowing through the Alchemist Agent graph."""
    # ── inputs ────────────────────────────────────────────────────────────────
    primary_category: str
    source_location: dict
    source_business_type: str
    source_business_id: str
    classification: dict
    confidence_threshold: float
    # ── intermediate ──────────────────────────────────────────────────────────
    compatible_types: list
    candidates: list
    category_info: dict
    market_price: float
    llm_result: dict
    best_candidate: dict
    # ── outputs ───────────────────────────────────────────────────────────────
    target_business_id: Optional[str]
    match_rationale: Optional[str]
    match_confidence: float
    distance_km: float
    estimated_source_savings: Optional[float]
    estimated_target_savings_pct: Optional[float]
    no_candidates: bool
    suppressed: bool
    error: Optional[str]


# Candidates must be provided via the request candidates list.


def _haversine_km(loc1: dict, loc2: dict) -> float:
    """Approximate km distance between two lat/lng points."""
    lat_diff = loc1.get("lat", 0) - loc2.get("lat", 0)
    lng_diff = loc1.get("lng", 0) - loc2.get("lng", 0)
    return math.sqrt(lat_diff ** 2 + lng_diff ** 2) * 111


# ──────────────────────────────────────────────────────────────────────────────
#  Node 1 — retrieve_reference_pairings
# ──────────────────────────────────────────────────────────────────────────────

def _node_retrieve_reference_pairings(state: AlchemistState) -> dict:
    """
    Look up compatible business types from reference_data/ for the
    classified category. Retrieval MUST happen before any rationale is
    generated — model reasons from retrieved facts, not invented ones.
    """
    compatible_types = get_compatible_business_types(state["primary_category"])
    category_info = get_category(state["primary_category"]) or {}
    market_price = get_market_price(state["primary_category"])

    if not compatible_types:
        logger.info("No compatible business types in reference data", extra={
            "sourceBusinessId": state["source_business_id"],
            "category": state["primary_category"],
        })
        return {
            "compatible_types": [],
            "category_info": category_info,
            "market_price": market_price,
            "no_candidates": True,
        }

    return {
        "compatible_types": compatible_types,
        "category_info": category_info,
        "market_price": market_price,
        "no_candidates": False,
    }


# ──────────────────────────────────────────────────────────────────────────────
#  Node 2 — discover_nearby_candidates
# ──────────────────────────────────────────────────────────────────────────────

def _node_discover_nearby_candidates(state: AlchemistState) -> dict:
    """
    Filter the candidate database to businesses of a compatible type within
    a 15 km radius of the source business.
    """
    radius_km = 15.0
    candidates = []
    source = state["source_location"]

    biz_list = state.get("candidates") or []

    for biz in biz_list:
        if biz["type"] not in state["compatible_types"]:
            continue
        dist = _haversine_km(source, {"lat": biz["lat"], "lng": biz["lng"]})
        if dist <= radius_km:
            candidate = biz.copy()
            candidate["distance_km"] = round(dist, 2)
            if "estimated_volume_capacity" not in candidate or candidate["estimated_volume_capacity"] is None:
                candidate["estimated_volume_capacity"] = 80
            if "estimated_cost" not in candidate or candidate["estimated_cost"] is None:
                candidate["estimated_cost"] = 40
            candidates.append(candidate)

    if not candidates:
        logger.info("No candidates in radius", extra={
            "sourceBusinessId": state["source_business_id"],
            "radius_km": radius_km,
            "compatibleTypes": state["compatible_types"],
        })
        return {"candidates": [], "no_candidates": True}

    return {"candidates": candidates, "no_candidates": False}


# ──────────────────────────────────────────────────────────────────────────────
#  Node 3 — llm_score_and_match
# ──────────────────────────────────────────────────────────────────────────────

async def _node_llm_score_and_match(state: AlchemistState) -> dict:
    """
    Single LLM call that ranks candidates, picks the best, writes the
    match rationale, and estimates confidence + savings.
    Reference data is injected so the LLM reasons from facts only.
    """
    safe_candidates = [
        {
            "id": c["id"],
            "name": c["name"],
            "type": c["type"],
            "distance_km": c.get("distance_km", 0.0),
            "estimated_volume_capacity_tons_per_month": c.get("estimated_volume_capacity"),
            "estimated_cost_per_ton": c.get("estimated_cost"),
        }
        for c in state["candidates"]
    ]

    system_prompt = (
        "You are EcoMatch's Alchemist Agent. You have a set of verified nearby "
        "candidate businesses and reference data for the material category. Your job:\n"
        "1. Pick the single BEST candidate for the source business's waste.\n"
        "2. Write a plain-language matchRationale for the business dashboard — "
        "only reference facts provided, do not invent chemistry, prices, or claims.\n"
        "3. Output matchConfidence (0.0–1.0) reflecting quality of this pairing "
        "(distance, capacity, type compatibility, economics). Be calibrated: a weak "
        "or forced match must score below 0.7.\n"
        "4. Estimate estimatedSourceSavings: annual dollars the source business saves "
        "vs. their current disposal cost.\n"
        "5. Estimate estimatedTargetSavingsPct: % the target saves vs. market price.\n\n"
        "REFERENCE DATA (ground all claims here):\n"
        f"  Material category: {state['primary_category']}\n"
        f"  Category description: {state['category_info'].get('description', 'N/A')}\n"
        f"  Market reference price: ${state['market_price']}/ton\n"
        f"  Source business type: {state['source_business_type']}\n\n"
        "Return targetBusinessId as the exact id string from the candidates list."
    )

    try:
        result = await llm_client.complete_json(
            system_prompt=system_prompt,
            operation="alchemist_score_and_match",
            user_payload={
                "sourceBusinessId": state["source_business_id"],
                "primaryCategory": state["primary_category"],
                "candidates": safe_candidates,
            },
            response_schema={
                "targetBusinessId": "exact id string of chosen candidate",
                "matchRationale": "plain-language explanation for the business dashboard",
                "matchConfidence": "float 0.0 to 1.0",
                "estimatedSourceSavings": "annual dollars saved by source (float)",
                "estimatedTargetSavingsPct": "% savings for target vs market price (float)",
            },
        )
        return {"llm_result": result, "error": None}
    except Exception as exc:
        logger.error("Alchemist LLM call failed", extra={
            "sourceBusinessId": state["source_business_id"],
            "error": str(exc),
        })
        return {"llm_result": {}, "error": str(exc), "no_candidates": True}


# ──────────────────────────────────────────────────────────────────────────────
#  Node 4 — confidence_gate
# ──────────────────────────────────────────────────────────────────────────────

def _node_confidence_gate(state: AlchemistState) -> dict:
    """
    Extracts LLM result fields and enforces the 0.7 confidence floor.
    Below threshold: suppressed — treated identically to no_candidates_in_radius
    per the architecture contract (ms1 sees "no match found yet", not a hidden row).
    """
    result = state.get("llm_result") or {}
    threshold = state["confidence_threshold"]

    best_id = result.get("targetBusinessId")
    rationale = str(result.get("matchRationale", ""))
    confidence = _coerce_confidence(result.get("matchConfidence"))
    source_savings = _to_float(result.get("estimatedSourceSavings"))
    target_savings_pct = _to_float(result.get("estimatedTargetSavingsPct"))

    # Resolve chosen candidate strictly from candidates list to prevent database FK issues
    candidates = state.get("candidates", [])
    best_candidate = next(
        (c for c in candidates if c["id"] == best_id),
        None,
    )
    if not best_candidate and candidates:
        best_candidate = candidates[0]
        best_id = best_candidate["id"]

    if confidence < threshold:
        logger.info("Match confidence below threshold — suppressed", extra={
            "sourceBusinessId": state["source_business_id"],
            "targetBusinessId": best_id,
            "matchConfidence": confidence,
            "threshold": threshold,
        })
        return {
            "match_confidence": confidence,
            "suppressed": True,
            "no_candidates": True,
        }

    return {
        "target_business_id": best_id,
        "match_rationale": rationale,
        "match_confidence": confidence,
        "distance_km": best_candidate.get("distance_km", 0.0) if best_candidate else 0.0,
        "estimated_source_savings": source_savings,
        "estimated_target_savings_pct": target_savings_pct,
        "suppressed": False,
    }


# ──────────────────────────────────────────────────────────────────────────────
#  Conditional routing
# ──────────────────────────────────────────────────────────────────────────────

def _route_after_reference_pairings(state: AlchemistState) -> str:
    return "end_no_match" if state.get("no_candidates") else "discover_nearby_candidates"


def _route_after_candidates(state: AlchemistState) -> str:
    return "end_no_match" if state.get("no_candidates") else "llm_score_and_match"


# ──────────────────────────────────────────────────────────────────────────────
#  Graph construction
# ──────────────────────────────────────────────────────────────────────────────

def _build_alchemist_graph():
    graph = StateGraph(AlchemistState)

    graph.add_node("retrieve_reference_pairings", _node_retrieve_reference_pairings)
    graph.add_node("discover_nearby_candidates", _node_discover_nearby_candidates)
    graph.add_node("llm_score_and_match", _node_llm_score_and_match)
    graph.add_node("confidence_gate", _node_confidence_gate)

    graph.set_entry_point("retrieve_reference_pairings")

    graph.add_conditional_edges(
        "retrieve_reference_pairings",
        _route_after_reference_pairings,
        {"end_no_match": END, "discover_nearby_candidates": "discover_nearby_candidates"},
    )
    graph.add_conditional_edges(
        "discover_nearby_candidates",
        _route_after_candidates,
        {"end_no_match": END, "llm_score_and_match": "llm_score_and_match"},
    )
    graph.add_edge("llm_score_and_match", "confidence_gate")
    graph.add_edge("confidence_gate", END)

    return graph.compile()


_alchemist_graph = _build_alchemist_graph()


# ──────────────────────────────────────────────────────────────────────────────
#  Public agent class (unchanged external API)
# ──────────────────────────────────────────────────────────────────────────────

class AlchemistAgent:
    """Alchemist Agent for finding compatible business matches.

    Wraps the compiled LangGraph StateGraph. External callers use .match()
    exactly as before.
    """

    def __init__(self):
        self.confidence_threshold = float(os.getenv("ALCHEMIST_CONFIDENCE_THRESHOLD", "0.7"))
        self._graph = _alchemist_graph

    async def match(self, request: MatchRequest) -> MatchResponse:
        start_time = time.time()

        primary_category = request.classification.get("primaryCategory", "unknown")

        initial_state: AlchemistState = {
            "primary_category": primary_category,
            "source_location": request.sourceBusinessLocation,
            "source_business_type": request.sourceBusinessType,
            "source_business_id": request.sourceBusinessId,
            "classification": request.classification,
            "confidence_threshold": self.confidence_threshold,
            # Intermediate / output defaults
            "compatible_types": [],
            "candidates": request.candidates,
            "category_info": {},
            "market_price": 0.0,
            "llm_result": {},
            "best_candidate": {},
            "target_business_id": None,
            "match_rationale": None,
            "match_confidence": 0.0,
            "distance_km": 0.0,
            "estimated_source_savings": None,
            "estimated_target_savings_pct": None,
            "no_candidates": False,
            "suppressed": False,
            "error": None,
        }

        try:
            final = await self._graph.ainvoke(initial_state)

            if final.get("no_candidates") or final.get("suppressed"):
                return MatchResponse(matchConfidence=final["match_confidence"], noCandidatesInRadius=True)

            logger.info("Match found", extra={
                "sourceBusinessId": request.sourceBusinessId,
                "targetBusinessId": final["target_business_id"],
                "matchConfidence": final["match_confidence"],
                "distanceKm": final["distance_km"],
                "latency_ms": int((time.time() - start_time) * 1000),
            })

            return MatchResponse(
                targetBusinessId=final["target_business_id"],
                matchRationale=final["match_rationale"],
                matchConfidence=final["match_confidence"],
                distanceKm=final["distance_km"],
                estimatedSourceSavings=final["estimated_source_savings"],
                estimatedTargetSavingsPct=final["estimated_target_savings_pct"],
            )

        except Exception as exc:
            logger.error("Alchemist graph invocation failed", extra={
                "sourceBusinessId": request.sourceBusinessId,
                "error": str(exc),
                "latency_ms": int((time.time() - start_time) * 1000),
            })
            return MatchResponse(matchConfidence=0.0, noCandidatesInRadius=True)


# ──────────────────────────────────────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _coerce_confidence(value: Any) -> float:
    try:
        return min(max(float(value), 0.0), 1.0)
    except (TypeError, ValueError):
        return 0.0


def _to_float(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


alchemist_agent = AlchemistAgent()

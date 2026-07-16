"""Verification Agent - Impact Calculation.

Implemented as a compiled LangGraph StateGraph with six linear nodes:

    validate_evidence
          │
          ▼
    llm_estimate_volume
          │
          ▼
    compute_co2e_avoided  (deterministic — EPA WARM)
          │
          ▼
    compute_dollars_saved  (deterministic)
          │
          ▼
    cite_methodology
          │
          ▼
    llm_sanity_check  ──► END

Deterministic calculations are authoritative — the LLM only contributes
volume estimation (when not provided) and a plausibility sanity check.
The agent never issues a certificate with more precision than its input supports.
"""

import time
from typing import TypedDict, Optional, Any

from langgraph.graph import StateGraph, END

from app.models import VerifyRequest, VerifyResponse
from app.reference_data.categories import get_emission_factor
from app.logger import logger
from app.llm import llm_client


# ──────────────────────────────────────────────────────────────────────────────
#  Typed state
# ──────────────────────────────────────────────────────────────────────────────

class VerificationState(TypedDict):
    """Full state flowing through the Verification Agent graph."""
    # ── inputs ────────────────────────────────────────────────────────────────
    match_id: str
    disposal_cost_per_unit: float
    disposal_frequency: str
    primary_category: str
    estimated_composition: Optional[dict]
    # ── intermediate ──────────────────────────────────────────────────────────
    volume_tons_per_month: float
    volume_is_estimated: bool
    # ── outputs ───────────────────────────────────────────────────────────────
    co2e_avoided_kg: float
    dollars_saved: float
    methodology_reference: str
    plausible: bool
    sanity_note: Optional[str]
    error: Optional[str]


# ──────────────────────────────────────────────────────────────────────────────
#  Node 1 — validate_evidence
# ──────────────────────────────────────────────────────────────────────────────

def _node_validate_evidence(state: VerificationState) -> dict:
    """
    Defensive re-check that required fields exist.
    ms1 gates this call after both verification records are confirmed, but we
    never trust the caller blindly on a step this consequential (AGENTS.md §5).
    """
    if not state.get("match_id"):
        raise ValueError("matchId is required for verification — missing from request")
    if state.get("disposal_cost_per_unit") is None:
        raise ValueError("disposalCostPerUnit is required for dollar savings calculation")
    return {}


# ──────────────────────────────────────────────────────────────────────────────
#  Node 2 — llm_estimate_volume
# ──────────────────────────────────────────────────────────────────────────────

async def _node_llm_estimate_volume(state: VerificationState) -> dict:
    """
    LLM infers a plausible monthly volume from disposal cost and frequency.
    Conservative by default — returns 1.0 ton/month with estimated=true when
    there is insufficient context rather than fabricating a number.
    """
    try:
        result = await llm_client.complete_json(
            system_prompt=(
                "You are EcoMatch's Verification Agent. Estimate the realistic monthly "
                "disposal volume in metric tons per month for a business based on the "
                "disposal cost and frequency provided. Be conservative — do not overestimate. "
                "If there is insufficient information, return 1.0 and set estimated=true."
            ),
            operation="verification_estimate_volume",
            user_payload={
                "primaryCategory": state["primary_category"],
                "disposalCostPerUnit": state["disposal_cost_per_unit"],
                "disposalFrequency": state["disposal_frequency"],
                "estimatedComposition": state.get("estimated_composition"),
            },
            response_schema={
                "volumeTonsPerMonth": "float — estimated monthly volume in metric tons",
                "estimated": "boolean — true if this is an estimate due to insufficient data",
            },
        )
        volume = max(float(result.get("volumeTonsPerMonth") or 1.0), 0.1)
        is_estimated = bool(result.get("estimated", False))
    except Exception as exc:
        logger.info("Volume estimation fallback", extra={
            "matchId": state["match_id"],
            "reason": str(exc),
        })
        volume = 1.0
        is_estimated = True

    return {"volume_tons_per_month": volume, "volume_is_estimated": is_estimated}


# ──────────────────────────────────────────────────────────────────────────────
#  Node 3 — compute_co2e_avoided  (deterministic)
# ──────────────────────────────────────────────────────────────────────────────

def _node_compute_co2e_avoided(state: VerificationState) -> dict:
    """EPA WARM methodology applied to the volume estimate (deterministic)."""
    emission_factor = get_emission_factor(state["primary_category"])
    if not emission_factor:
        return {"co2e_avoided_kg": 0.0}

    annual_volume = state["volume_tons_per_month"] * 12
    co2e_per_ton = emission_factor.get("co2e_per_ton", 0.0)
    total_kg = round(annual_volume * co2e_per_ton * 1000, 2)  # convert MT→kg
    return {"co2e_avoided_kg": total_kg}


# ──────────────────────────────────────────────────────────────────────────────
#  Node 4 — compute_dollars_saved  (deterministic)
# ──────────────────────────────────────────────────────────────────────────────

_FREQUENCY_MULTIPLIERS = {
    "daily": 365,
    "weekly": 52,
    "biweekly": 26,
    "monthly": 12,
    "quarterly": 4,
    "annual": 1,
}


def _node_compute_dollars_saved(state: VerificationState) -> dict:
    """Actual agreed terms vs. original disposal cost (deterministic)."""
    multiplier = _FREQUENCY_MULTIPLIERS.get(state["disposal_frequency"], 12)
    savings = round(
        state["disposal_cost_per_unit"] * state["volume_tons_per_month"] * multiplier, 2
    )
    return {"dollars_saved": savings}


# ──────────────────────────────────────────────────────────────────────────────
#  Node 5 — cite_methodology
# ──────────────────────────────────────────────────────────────────────────────

def _node_cite_methodology(state: VerificationState) -> dict:
    """
    Attach the methodology reference so the certificate is auditable.
    If the volume was estimated, append a note so the certificate never
    overstates precision.
    """
    emission_factor = get_emission_factor(state["primary_category"])
    if emission_factor:
        methodology = emission_factor.get("methodology", "Unknown methodology")
    else:
        methodology = "Custom calculation (no EPA WARM factor available for this category)"

    if state.get("volume_is_estimated"):
        methodology += " [VOLUME ESTIMATED — insufficient input data for exact figure]"

    return {"methodology_reference": methodology}


# ──────────────────────────────────────────────────────────────────────────────
#  Node 6 — llm_sanity_check
# ──────────────────────────────────────────────────────────────────────────────

async def _node_llm_sanity_check(state: VerificationState) -> dict:
    """
    LLM checks whether the computed CO2e and savings values are plausible
    before they reach the certificate.  Flags implausible values and appends
    a note to the methodology string — never suppresses the output entirely.
    """
    try:
        result = await llm_client.complete_json(
            system_prompt=(
                "You are a verification reviewer for EcoMatch environmental certificates. "
                "Given the material category, volume, CO2e avoided, and dollar savings, "
                "determine if these numbers are plausible and internally consistent. "
                "Flag values that are unrealistically high, negative, or mathematically "
                "inconsistent with the methodology. Return plausible=false with a brief reason "
                "if the numbers look wrong; plausible=true if they are acceptable."
            ),
            operation="verification_sanity_check",
            user_payload={
                "primaryCategory": state["primary_category"],
                "volumeTonsPerMonth": state["volume_tons_per_month"],
                "co2eAvoidedKg": state["co2e_avoided_kg"],
                "dollarsSaved": state["dollars_saved"],
                "methodology": state["methodology_reference"],
            },
            response_schema={
                "plausible": "boolean — true if values are reasonable",
                "reason": "brief explanation if plausible is false, else null",
            },
        )
        plausible = bool(result.get("plausible", True))
        reason = result.get("reason") or None
    except Exception as exc:
        logger.info("Sanity check fallback", extra={
            "matchId": state["match_id"],
            "reason": str(exc),
        })
        plausible = True
        reason = None

    updates: dict = {"plausible": plausible, "sanity_note": reason}

    if not plausible and reason:
        logger.warning("Verification sanity check failed", extra={
            "matchId": state["match_id"],
            "co2eAvoidedKg": state["co2e_avoided_kg"],
            "dollarsSaved": state["dollars_saved"],
            "sanityNote": reason,
        })
        # Append flag to methodology so cert is auditable
        updates["methodology_reference"] = (
            state["methodology_reference"] + f" [ESTIMATED — {reason}]"
        )

    return updates


# ──────────────────────────────────────────────────────────────────────────────
#  Graph construction (all edges are linear)
# ──────────────────────────────────────────────────────────────────────────────

def _build_verification_graph():
    graph = StateGraph(VerificationState)

    graph.add_node("validate_evidence", _node_validate_evidence)
    graph.add_node("llm_estimate_volume", _node_llm_estimate_volume)
    graph.add_node("compute_co2e_avoided", _node_compute_co2e_avoided)
    graph.add_node("compute_dollars_saved", _node_compute_dollars_saved)
    graph.add_node("cite_methodology", _node_cite_methodology)
    graph.add_node("llm_sanity_check", _node_llm_sanity_check)

    graph.set_entry_point("validate_evidence")
    graph.add_edge("validate_evidence", "llm_estimate_volume")
    graph.add_edge("llm_estimate_volume", "compute_co2e_avoided")
    graph.add_edge("compute_co2e_avoided", "compute_dollars_saved")
    graph.add_edge("compute_dollars_saved", "cite_methodology")
    graph.add_edge("cite_methodology", "llm_sanity_check")
    graph.add_edge("llm_sanity_check", END)

    return graph.compile()


_verification_graph = _build_verification_graph()


# ──────────────────────────────────────────────────────────────────────────────
#  Public agent class (unchanged external API)
# ──────────────────────────────────────────────────────────────────────────────

class VerificationAgent:
    """Verification Agent for CO2e and savings calculation.

    Wraps the compiled LangGraph StateGraph. External callers use .verify()
    exactly as before.
    """

    def __init__(self):
        self._graph = _verification_graph

    async def verify(self, request: VerifyRequest) -> VerifyResponse:
        start_time = time.time()

        initial_state: VerificationState = {
            "match_id": request.matchId,
            "disposal_cost_per_unit": request.disposalCostPerUnit,
            "disposal_frequency": request.disposalFrequency,
            "primary_category": request.primaryCategory,
            "estimated_composition": request.estimatedComposition,
            # Defaults
            "volume_tons_per_month": 1.0,
            "volume_is_estimated": True,
            "co2e_avoided_kg": 0.0,
            "dollars_saved": 0.0,
            "methodology_reference": "",
            "plausible": True,
            "sanity_note": None,
            "error": None,
        }

        try:
            final = await self._graph.ainvoke(initial_state)

            logger.info("Verification complete", extra={
                "matchId": request.matchId,
                "co2eAvoidedKg": final["co2e_avoided_kg"],
                "dollarsSaved": final["dollars_saved"],
                "methodology": final["methodology_reference"],
                "volumeTonsPerMonth": final["volume_tons_per_month"],
                "latency_ms": int((time.time() - start_time) * 1000),
            })

            return VerifyResponse(
                co2eAvoidedKg=final["co2e_avoided_kg"],
                dollarsSaved=final["dollars_saved"],
                methodologyReference=final["methodology_reference"],
            )

        except Exception as exc:
            logger.error("Verification graph invocation failed", extra={
                "matchId": request.matchId,
                "error": str(exc),
                "latency_ms": int((time.time() - start_time) * 1000),
            })
            raise


verification_agent = VerificationAgent()

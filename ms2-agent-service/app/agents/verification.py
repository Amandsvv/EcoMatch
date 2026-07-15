"""Verification Agent - Impact Calculation.

Deterministic CO2e and savings calculations remain authoritative (EPA WARM).
The LLM contributes two decisions:
  1. Volume estimation: infers monthly volume from context when not provided directly.
  2. Sanity check: flags implausible calculated values before they reach the certificate.
"""

import os
from app.models import VerifyRequest, VerifyResponse
from app.reference_data.categories import get_emission_factor
from app.logger import logger
from app.llm import llm_client
import time


class VerificationAgent:
    """Verification Agent for CO2e and savings calculation."""
    
    async def verify(self, request: VerifyRequest) -> VerifyResponse:
        """
        Calculate CO2e avoided and dollars saved.

        Pipeline:
        1. validate_evidence_presence  — defensive re-check (ms1 already gated this)
        2. llm_estimate_volume         — LLM infers monthly volume from context
        3. compute_co2e_avoided        — deterministic EPA WARM calculation
        4. compute_dollars_saved       — deterministic from actual terms
        5. cite_methodology            — attach auditable reference
        6. llm_sanity_check            — LLM flags implausible values before certificate
        """
        start_time = time.time()

        try:
            # Step 1: validate_evidence_presence (defensive re-check)
            if not request.matchId:
                raise ValueError("matchId required")

            # Step 2: LLM estimates volume from context
            volume_tons_per_month = await self._llm_estimate_volume(request)

            # Step 3: compute_co2e_avoided (deterministic)
            co2e_avoided = self._compute_co2e_avoided(
                request.primaryCategory,
                request.estimatedComposition,
                volume_tons_per_month,
            )

            # Step 4: compute_dollars_saved (deterministic)
            dollars_saved = self._compute_dollars_saved(
                request.disposalCostPerUnit,
                request.disposalFrequency,
                volume_tons_per_month,
            )

            # Step 5: cite_methodology
            emission_factor = get_emission_factor(request.primaryCategory)
            methodology = (
                emission_factor.get("methodology", "Unknown")
                if emission_factor
                else "Custom calculation"
            )

            # Step 6: LLM sanity check — flag implausible values before cert
            plausible, sanity_note = await self._llm_sanity_check(
                request.primaryCategory,
                volume_tons_per_month,
                co2e_avoided,
                dollars_saved,
                methodology,
            )

            if not plausible:
                logger.warning("Verification sanity check failed", extra={
                    "matchId": request.matchId,
                    "co2eAvoidedKg": co2e_avoided,
                    "dollarsSaved": dollars_saved,
                    "sanityNote": sanity_note,
                })
                methodology = f"{methodology} [ESTIMATED — {sanity_note}]"

            logger.info("Verification complete", extra={
                "matchId": request.matchId,
                "co2eAvoidedKg": co2e_avoided,
                "dollarsSaved": dollars_saved,
                "methodology": methodology,
                "volumeTonsPerMonth": volume_tons_per_month,
                "latency_ms": int((time.time() - start_time) * 1000),
            })

            return VerifyResponse(
                co2eAvoidedKg=co2e_avoided,
                dollarsSaved=dollars_saved,
                methodologyReference=methodology,
            )

        except Exception as e:
            logger.error("Verification failed", extra={
                "matchId": request.matchId,
                "error": str(e),
                "latency_ms": int((time.time() - start_time) * 1000),
            })
            raise
    
    async def _llm_estimate_volume(
        self,
        request: VerifyRequest,
    ) -> float:
        """
        LLM infers a plausible monthly volume (tons/month) from context.
        Replaces the previous hardcoded 1.0 ton/month assumption.
        Returns a conservative estimate; caller treats it as approximate.
        """
        result = await llm_client.complete_json(
            system_prompt=(
                "You are EcoMatch's Verification Agent. Estimate the realistic monthly "
                "disposal volume in metric tons per month for a business based on the "
                "disposal cost and frequency provided. Be conservative — do not overestimate. "
                "If there is insufficient information, return 1.0 and set estimated=true."
            ),
            operation="verification_estimate_volume",
            user_payload={
                "primaryCategory": request.primaryCategory,
                "disposalCostPerUnit": request.disposalCostPerUnit,
                "disposalFrequency": request.disposalFrequency,
                "estimatedComposition": request.estimatedComposition,
            },
            response_schema={
                "volumeTonsPerMonth": "float — estimated monthly volume in metric tons",
                "estimated": "boolean — true if this is an estimate due to insufficient data",
            },
        )
        volume = float(result.get("volumeTonsPerMonth") or 1.0)
        # Safety clamp: never return 0 or negative
        return max(volume, 0.1)

    def _compute_co2e_avoided(
        self,
        category: str,
        composition: dict | None,
        volume_tons_per_month: float,
    ) -> float:
        """Compute CO2e avoided using EPA WARM methodology (deterministic)."""
        emission_factor = get_emission_factor(category)
        if not emission_factor:
            return 0.0

        annual_volume = volume_tons_per_month * 12
        co2e_per_ton = emission_factor.get("co2e_per_ton", 0.0)
        total_co2e_kg = annual_volume * co2e_per_ton * 1000  # convert to kg

        return round(total_co2e_kg, 2)

    def _compute_dollars_saved(
        self,
        disposal_cost_per_unit: float,
        disposal_frequency: str,
        volume_tons_per_month: float,
    ) -> float:
        """Compute dollars saved vs. alternative disposal (deterministic)."""
        frequency_multipliers = {
            "daily": 365,
            "weekly": 52,
            "biweekly": 26,
            "monthly": 12,
            "quarterly": 4,
            "annual": 1,
        }
        multiplier = frequency_multipliers.get(disposal_frequency, 12)
        annual_savings = disposal_cost_per_unit * volume_tons_per_month * multiplier
        return round(annual_savings, 2)

    async def _llm_sanity_check(
        self,
        category: str,
        volume_tons_per_month: float,
        co2e_avoided_kg: float,
        dollars_saved: float,
        methodology: str,
    ) -> tuple[bool, str | None]:
        """
        LLM checks whether the computed CO2e and savings values are plausible
        before they are written to the certificate. Returns (plausible, note).
        """
        result = await llm_client.complete_json(
            system_prompt=(
                "You are a verification reviewer for EcoMatch environmental certificates. "
                "Given the material category, volume, CO2e avoided, and dollar savings, "
                "determine if these numbers are plausible and internally consistent. "
                "Flag values that are unrealistically high, negative, or mathematically "
                "inconsistent with the methodology. Return plausible=false with a brief "
                "reason if the numbers look wrong; plausible=true if they are acceptable."
            ),
            operation="verification_sanity_check",
            user_payload={
                "primaryCategory": category,
                "volumeTonsPerMonth": volume_tons_per_month,
                "co2eAvoidedKg": co2e_avoided_kg,
                "dollarsSaved": dollars_saved,
                "methodology": methodology,
            },
            response_schema={
                "plausible": "boolean — true if values are reasonable",
                "reason": "brief explanation if plausible is false, else null",
            },
        )
        plausible = bool(result.get("plausible", True))
        reason = result.get("reason") or None
        return plausible, reason


verification_agent = VerificationAgent()

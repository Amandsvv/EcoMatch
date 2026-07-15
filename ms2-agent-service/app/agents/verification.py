"""Verification Agent - Impact Calculation."""

import os
from app.models import VerifyRequest, VerifyResponse
from app.reference_data.categories import get_emission_factor
from app.logger import logger
import time


class VerificationAgent:
    """Verification Agent for CO2e and savings calculation."""
    
    async def verify(self, request: VerifyRequest) -> VerifyResponse:
        """
        Calculate CO2e avoided and dollars saved.
        
        Pipeline:
        1. validate_evidence_presence - defensive check (ms1 already gated this)
        2. compute_co2e_avoided - apply EPA WARM methodology
        3. compute_dollars_saved - based on actual terms vs. baseline
        4. cite_methodology - auditable reference
        """
        start_time = time.time()
        
        try:
            # Step 1: validate_evidence_presence (defensive re-check)
            # In Phase 1a, we trust ms1's gate; real implementation would verify against DB
            if not request.matchId:
                raise ValueError("matchId required")
            
            # Step 2: compute_co2e_avoided
            co2e_avoided = self._compute_co2e_avoided(
                request.primaryCategory,
                request.estimatedComposition,
            )
            
            # Step 3: compute_dollars_saved
            dollars_saved = self._compute_dollars_saved(
                request.disposalCostPerUnit,
                request.disposalFrequency,
            )
            
            # Step 4: cite_methodology
            emission_factor = get_emission_factor(request.primaryCategory)
            methodology = emission_factor.get("methodology", "Unknown") if emission_factor else "Custom calculation"
            
            logger.info("Verification complete", extra={
                "matchId": request.matchId,
                "co2eAvoidedKg": co2e_avoided,
                "dollarsSaved": dollars_saved,
                "methodology": methodology,
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
    
    def _compute_co2e_avoided(
        self,
        category: str,
        composition: dict | None,
    ) -> float:
        """
        Compute CO2e avoided using EPA WARM methodology.
        
        Phase 1a: simplified with mock volumes
        """
        emission_factor = get_emission_factor(category)
        if not emission_factor:
            return 0.0
        
        # Mock volume: 1 ton per month for Phase 1a
        volume_tons_per_month = 1.0
        annual_volume = volume_tons_per_month * 12
        
        # CO2e factor in kg per ton
        co2e_per_ton = emission_factor.get("co2e_per_ton", 0.0)
        
        # Total CO2e avoided annually (conservative estimate)
        total_co2e_kg = annual_volume * co2e_per_ton * 1000  # Convert to kg
        
        return round(total_co2e_kg, 2)
    
    def _compute_dollars_saved(
        self,
        disposal_cost_per_unit: float,
        disposal_frequency: str,
    ) -> float:
        """
        Compute dollars saved vs. alternative disposal.
        
        Based on actual terms (ms1 passes agreed_price, this agent compares to original disposal cost).
        """
        # Phase 1a: simple calculation
        # Assuming 1 unit per month for Phase 1a
        units_per_month = 1.0
        
        # Map frequency to annual multiplier
        frequency_multipliers = {
            "daily": 365,
            "weekly": 52,
            "biweekly": 26,
            "monthly": 12,
            "quarterly": 4,
            "annual": 1,
        }
        
        multiplier = frequency_multipliers.get(disposal_frequency, 12)
        annual_savings = disposal_cost_per_unit * units_per_month * multiplier
        
        return round(annual_savings, 2)


verification_agent = VerificationAgent()

"""Alchemist Agent - Compatibility Matching.

All scoring, rationale generation, confidence estimation, and savings
calculations are driven by the LLM. Reference data (compatible business types,
market prices) is retrieved first and injected into the LLM prompt so the model
reasons from grounded facts rather than inventing them.

The only Python-enforced rule post-LLM: matchConfidence < 0.7 → suppressed,
no match row created. This mirrors the safety-relevant gate in architecture.md.
"""

import os
import time
from app.models import MatchRequest, MatchResponse
from app.reference_data.categories import (
    get_compatible_business_types,
    get_market_price,
    get_category,
)
from app.logger import logger
from app.llm import llm_client


class AlchemistAgent:
    """Alchemist Agent for finding compatible business matches.

    Pipeline:
    1. retrieve_reference_pairings  — look up allowed compatible business types from reference data
    2. discover_nearby_candidates   — geometric filter within radius (deterministic)
    3. llm_score_and_match          — LLM ranks candidates, picks best, generates rationale,
                                       confidence score, and savings estimates
    4. confidence_gate              — Python enforces: < 0.7 = suppressed, never shown
    """

    def __init__(self):
        self.confidence_threshold = float(os.getenv("ALCHEMIST_CONFIDENCE_THRESHOLD", "0.7"))
        # Mock business database (Phase 1a: stub — real DB query in ms1 integration)
        self.candidate_businesses = self._mock_candidate_businesses()
    
    async def match(self, request: MatchRequest) -> MatchResponse:
        """
        Find compatible business match.
        
        Pipeline:
        1. retrieve_reference_pairings - look up compatible types
        2. discover_nearby_candidates - find businesses in radius
        3. score_candidates - rank by distance + value
        4. generate_rationale - LLM call with grounded reasoning
        5. estimate_value - compute savings estimates
        """
        start_time = time.time()
        
        try:
            primary_category = request.classification.get("primaryCategory", "unknown")
            
            # Step 1: retrieve_reference_pairings (GROUNDED)
            compatible_types = get_compatible_business_types(primary_category)
            if not compatible_types:
                logger.info("No compatible business types", extra={
                    "sourceBusinessId": request.sourceBusinessId,
                    "category": primary_category,
                })
                return MatchResponse(
                    matchConfidence=0.0,
                    noCandidatesInRadius=True,
                )
            
            # Step 2: discover_nearby_candidates
            candidates = self._discover_nearby_candidates(
                request.sourceBusinessLocation,
                compatible_types,
                radius_km=15,  # 15km default radius
            )
            
            if not candidates:
                logger.info("No candidates in radius", extra={
                    "sourceBusinessId": request.sourceBusinessId,
                    "radius_km": 15,
                })
                return MatchResponse(
                    matchConfidence=0.0,
                    noCandidatesInRadius=True,
                )
            
            # Step 3: LLM scores candidates, picks best, generates rationale + savings
            category_info = get_category(primary_category) or {}
            market_price = get_market_price(primary_category)
            llm_result = await self._llm_score_and_match(
                request=request,
                candidates=candidates,
                primary_category=primary_category,
                category_info=category_info,
                market_price=market_price,
            )

            best_id = llm_result.get("targetBusinessId")
            rationale = str(llm_result.get("matchRationale", ""))
            match_confidence = self._coerce_confidence(llm_result.get("matchConfidence"))
            source_savings = float(llm_result.get("estimatedSourceSavings") or 0.0)
            target_savings_pct = float(llm_result.get("estimatedTargetSavingsPct") or 0.0)

            # Resolve chosen candidate for distance
            best_candidate = next(
                (c for c in candidates if c["id"] == best_id), candidates[0]
            )

            # Step 4: confidence gate — Python enforces the 0.7 floor
            if match_confidence < self.confidence_threshold:
                logger.info("Match confidence below threshold — suppressed", extra={
                    "sourceBusinessId": request.sourceBusinessId,
                    "targetBusinessId": best_id,
                    "matchConfidence": match_confidence,
                })
                # Treat exactly as no_candidates_in_radius per architecture contract
                return MatchResponse(
                    matchConfidence=match_confidence,
                    noCandidatesInRadius=True,
                )

            logger.info("Match found", extra={
                "sourceBusinessId": request.sourceBusinessId,
                "targetBusinessId": best_id,
                "matchConfidence": match_confidence,
                "distanceKm": best_candidate.get("distance_km", 0.0),
                "latency_ms": int((time.time() - start_time) * 1000),
            })

            return MatchResponse(
                targetBusinessId=best_id,
                matchRationale=rationale,
                matchConfidence=match_confidence,
                distanceKm=best_candidate.get("distance_km", 0.0),
                estimatedSourceSavings=source_savings,
                estimatedTargetSavingsPct=target_savings_pct,
            )

        except Exception as e:
            logger.error("Matching failed", extra={
                "sourceBusinessId": request.sourceBusinessId,
                "error": str(e),
                "latency_ms": int((time.time() - start_time) * 1000),
            })
            return MatchResponse(
                matchConfidence=0.0,
                noCandidatesInRadius=True,
            )
    
    def _mock_candidate_businesses(self) -> list[dict]:
        """Mock business database for Phase 1a."""
        return [
            {
                "id": "00000000-0000-0000-0000-000000000001",
                "name": "Local Compost Operations",
                "type": "compost_operation",
                "lat": 40.715,
                "lng": -74.008,
                "estimated_volume_capacity": 100,  # tons/month
                "estimated_cost": 50,  # $/ton
            },
            {
                "id": "00000000-0000-0000-0000-000000000002",
                "name": "Urban Mushroom Farm",
                "type": "mushroom_farm",
                "lat": 40.720,
                "lng": -74.005,
                "estimated_volume_capacity": 50,
                "estimated_cost": 60,
            },
            {
                "id": "00000000-0000-0000-0000-000000000003",
                "name": "Recycling Hub",
                "type": "recycling_center",
                "lat": 40.710,
                "lng": -74.015,
                "estimated_volume_capacity": 200,
                "estimated_cost": 30,
            },
        ]
    
    def _discover_nearby_candidates(
        self, 
        source_location: dict, 
        compatible_types: list[str],
        radius_km: float = 15,
    ) -> list[dict]:
        """Discover nearby businesses of compatible types."""
        candidates = []
        for business in self.candidate_businesses:
            if business["type"] not in compatible_types:
                continue
            
            # Mock distance calculation
            distance = self._mock_distance(
                source_location,
                {"lat": business["lat"], "lng": business["lng"]},
            )
            
            if distance <= radius_km:
                business_copy = business.copy()
                business_copy["distance_km"] = distance
                candidates.append(business_copy)
        
        return candidates
    
    def _mock_distance(self, loc1: dict, loc2: dict) -> float:
        """Mock distance calculation (Phase 1a stub)."""
        # Simple Euclidean distance as proxy for km
        import math
        lat_diff = loc1["lat"] - loc2["lat"]
        lng_diff = loc1["lng"] - loc2["lng"]
        # Rough conversion to km (111 km per degree)
        return math.sqrt(lat_diff**2 + lng_diff**2) * 111
    
    async def _llm_score_and_match(
        self,
        request: MatchRequest,
        candidates: list[dict],
        primary_category: str,
        category_info: dict,
        market_price: float,
    ) -> dict:
        """
        Single LLM call covering ALL Alchemist scoring decisions:
          - Rank the discovered candidates and pick the best match
          - Explain WHY this pairing makes sense (grounded in injected reference data)
          - Estimate matchConfidence (0.0–1.0)
          - Estimate annual source savings ($ avoided vs. current disposal cost)
          - Estimate target savings percentage (vs. market price reference)

        Reference data is injected into the prompt so the LLM reasons from facts,
        not from invented compatibility claims.
        """
        # Safe candidate representation (exclude internal scoring fields)
        safe_candidates = [
            {
                "id": c["id"],
                "name": c["name"],
                "type": c["type"],
                "distance_km": round(c.get("distance_km", 0.0), 2),
                "estimated_volume_capacity_tons_per_month": c.get("estimated_volume_capacity"),
                "estimated_cost_per_ton": c.get("estimated_cost"),
            }
            for c in candidates
        ]

        system_prompt = (
            "You are EcoMatch's Alchemist Agent. You have already identified a set of nearby "
            "candidate businesses of compatible types. Your job is to:\n"
            "1. Pick the single BEST candidate for the source business's waste material.\n"
            "2. Write a plain-language matchRationale that a business owner will read on their "
            "dashboard, explaining why this pairing makes environmental and economic sense. "
            "Only reference facts provided to you — do not invent chemistry, prices, or claims.\n"
            "3. Output a matchConfidence (0.0–1.0) reflecting how good this pairing is, "
            "considering distance, capacity fit, type compatibility, and economic alignment. "
            "Be calibrated: a weak or forced match should score below 0.7.\n"
            "4. Estimate estimatedSourceSavings: annual dollars the source business avoids by "
            "diverting to this match instead of paying their current disposal cost.\n"
            "5. Estimate estimatedTargetSavingsPct: percentage the target saves vs. market price "
            "if they receive this material at the proposed cost.\n\n"
            "REFERENCE DATA (ground all claims in these facts):\n"
            f"  Material category: {primary_category}\n"
            f"  Category description: {category_info.get('description', 'N/A')}\n"
            f"  Reference market price: ${market_price}/ton\n"
            f"  Source business type: {request.sourceBusinessType}\n"
            f"  Source disposal cost per unit: ${request.classification.get('disposalCostPerUnit', 'unknown')}\n"
            f"  Source disposal frequency: {request.classification.get('disposalFrequency', 'unknown')}\n\n"
            "Return targetBusinessId as the exact id string from the candidates list."
        )

        return await llm_client.complete_json(
            system_prompt=system_prompt,
            operation="alchemist_score_and_match",
            user_payload={
                "sourceBusinessId": request.sourceBusinessId,
                "primaryCategory": primary_category,
                "candidates": safe_candidates,
            },
            response_schema={
                "targetBusinessId": "exact id string of the chosen candidate",
                "matchRationale": "plain-language explanation for the business dashboard",
                "matchConfidence": "float 0.0 to 1.0",
                "estimatedSourceSavings": "annual dollars saved by source business (float)",
                "estimatedTargetSavingsPct": "percentage savings for target vs market price (float)",
            },
        )

    def _coerce_confidence(self, value) -> float:
        """Clamp LLM confidence into [0, 1]; default 0.0 on parse failure."""
        try:
            return min(max(float(value), 0.0), 1.0)
        except (TypeError, ValueError):
            return 0.0


alchemist_agent = AlchemistAgent()

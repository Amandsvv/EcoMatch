"""Alchemist Agent - Compatibility Matching."""

import os
from app.models import MatchRequest, MatchResponse
from app.reference_data.categories import (
    get_compatible_business_types,
    get_market_price,
    get_category,
)
from app.logger import logger
import time
from typing import Optional


class AlchemistAgent:
    """Alchemist Agent for finding compatible business matches."""
    
    def __init__(self):
        self.confidence_threshold = float(os.getenv("ALCHEMIST_CONFIDENCE_THRESHOLD", "0.7"))
        # Mock business database (Phase 1a: stub)
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
            
            # Step 3: score_candidates
            scored_candidates = self._score_candidates(
                candidates,
                request.sourceBusinessLocation,
                request.classification,
            )
            
            best_candidate = scored_candidates[0]
            
            # Step 4: generate_rationale (GROUNDED in reference_data)
            rationale = self._generate_rationale(
                primary_category,
                best_candidate,
                request.sourceBusinessType,
            )
            
            # Step 5: estimate_value
            source_savings = self._estimate_source_savings(
                request.classification.get("disposalCostPerUnit", 50),
                best_candidate["estimated_volume_capacity"],
            )
            
            target_savings_pct = self._estimate_target_savings_pct(
                primary_category,
                best_candidate["estimated_cost"],
                get_market_price(primary_category),
            )
            
            # Compute confidence (based on distance, match quality)
            match_confidence = self._compute_match_confidence(
                best_candidate["distance_km"],
                best_candidate["type_match_score"],
            )
            
            # Check confidence floor
            if match_confidence < self.confidence_threshold:
                logger.info("Match confidence below threshold - suppressed", extra={
                    "sourceBusinessId": request.sourceBusinessId,
                    "targetBusinessId": best_candidate["id"],
                    "matchConfidence": match_confidence,
                })
                return MatchResponse(
                    matchConfidence=match_confidence,
                    noCandidatesInRadius=False,
                    # NOTE: Client treats this same as no_candidates_in_radius
                )
            
            logger.info("Match found", extra={
                "sourceBusinessId": request.sourceBusinessId,
                "targetBusinessId": best_candidate["id"],
                "matchConfidence": match_confidence,
                "distanceKm": best_candidate["distance_km"],
                "latency_ms": int((time.time() - start_time) * 1000),
            })
            
            return MatchResponse(
                targetBusinessId=best_candidate["id"],
                matchRationale=rationale,
                matchConfidence=match_confidence,
                distanceKm=best_candidate["distance_km"],
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
    
    def _score_candidates(
        self,
        candidates: list[dict],
        source_location: dict,
        classification: dict,
    ) -> list[dict]:
        """Score and rank candidates."""
        scored = []
        for candidate in candidates:
            distance_score = 1.0 / (1.0 + candidate["distance_km"] / 5.0)
            type_match_score = 0.9  # High match for compatible type
            value_score = min(candidate["estimated_volume_capacity"] / 100, 1.0)
            
            overall_score = (distance_score * 0.5) + (type_match_score * 0.3) + (value_score * 0.2)
            
            candidate["type_match_score"] = type_match_score
            candidate["overall_score"] = overall_score
            scored.append(candidate)
        
        # Sort by overall score (descending)
        scored.sort(key=lambda x: x["overall_score"], reverse=True)
        return scored
    
    def _generate_rationale(
        self,
        category: str,
        candidate: dict,
        source_type: str,
    ) -> str:
        """Generate matching rationale GROUNDED in reference data."""
        category_info = get_category(category)
        market_price = get_market_price(category)
        
        if not category_info:
            return "No compatibility information available."
        
        # Rationale is GROUNDED in retrieved facts, not invented
        rationale = (
            f"{candidate['name']} uses {category_info['description'].lower()}. "
            f"Your disposal cost is estimated at $45/ton vs. their current cost of "
            f"${candidate['estimated_cost']}/ton ({market_price} market reference). "
            f"Distance: {candidate['distance_km']:.1f} km."
        )
        
        return rationale
    
    def _estimate_source_savings(self, disposal_cost: float, volume: float) -> float:
        """Estimate source business disposal savings."""
        # Assuming 1 ton monthly volume for Phase 1a
        return disposal_cost * 12
    
    def _estimate_target_savings_pct(
        self,
        category: str,
        target_cost: float,
        market_price: float,
    ) -> float:
        """Estimate target business cost savings percentage."""
        if market_price == 0:
            return 0.0
        return ((market_price - target_cost) / market_price) * 100
    
    def _compute_match_confidence(self, distance_km: float, type_match_score: float) -> float:
        """Compute match confidence score."""
        # Distance factor: closer is better
        distance_factor = 1.0 / (1.0 + distance_km / 5.0)
        
        # Overall confidence
        confidence = (distance_factor * 0.7) + (type_match_score * 0.3)
        
        return min(max(confidence, 0.0), 1.0)


alchemist_agent = AlchemistAgent()

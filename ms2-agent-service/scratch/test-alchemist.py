import asyncio
import os
import sys

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.alchemist import (
    _node_retrieve_reference_pairings,
    _node_discover_nearby_candidates,
    _node_llm_score_and_match,
    _CANDIDATE_BUSINESSES
)

async def test():
    initial_state = {
        "primary_category": "organic_biomass",
        "source_location": {"lat": 28.1902, "lng": 77.0669},
        "source_business_type": "restaurant",
        "source_business_id": "710fc23a-d959-40a0-b705-7aae981cc573",
        "classification": {
            "primaryCategory": "organic_biomass",
            "confidence": 0.9,
            "hazardFlag": False
        },
        "confidence_threshold": 0.7,
        "compatible_types": [],
        "candidates": [],
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
    
    print("\n--- Running Node 1 ---")
    s1 = _node_retrieve_reference_pairings(initial_state)
    initial_state.update(s1)
    
    print("\n--- Running Node 2 ---")
    s2 = _node_discover_nearby_candidates(initial_state)
    initial_state.update(s2)
    
    print("\n--- Running Node 3 ---")
    s3 = await _node_llm_score_and_match(initial_state)
    print("Output from Node 3:", s3)

if __name__ == "__main__":
    asyncio.run(test())

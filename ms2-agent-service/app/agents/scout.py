"""Scout Agent - Material Classification."""

import os
from app.models import ClassifyRequest, ClassifyResponse
from app.reference_data.categories import get_all_categories, get_category
from app.logger import logger
import time


class ScoutAgent:
    """Scout Agent for material classification and hazard detection."""
    
    def __init__(self):
        self.confidence_threshold = float(os.getenv("SCOUT_CONFIDENCE_THRESHOLD", "0.7"))
        self.categories = get_all_categories()
    
    async def classify(self, request: ClassifyRequest) -> ClassifyResponse:
        """
        Classify material submission.
        
        Pipeline:
        1. parse_input - normalize raw text + photos
        2. classify_category - closed-set classification against 6 categories
        3. estimate_composition - estimate material properties (if applicable)
        4. compute_confidence - confidence score based on signals
        5. hazard_check - deterministic check (fail-safe)
        6. followup_decision - ask clarifying question if confidence < 0.7
        """
        start_time = time.time()
        
        try:
            # Step 1: parse_input
            parsed_text = self._parse_input(request.rawDescription, request.photoRefs)
            
            # Step 2: classify_category (mock implementation for Phase 1a)
            category, subtype = self._classify_category(parsed_text)
            
            # Step 3: estimate_composition
            composition = self._estimate_composition(category, parsed_text)
            
            # Step 4: compute_confidence
            confidence = self._compute_confidence(
                category, 
                has_photo=bool(request.photoRefs),
                clarity_score=self._assess_clarity(parsed_text)
            )
            
            # Step 5: hazard_check (DETERMINISTIC - fail-safe)
            hazard_flag = not (category in self.categories)  # If not in allowed categories, hazardous
            if hazard_flag:
                # If we can't confidently classify it, treat as hazardous
                logger.info("Hazard flag set", extra={
                    "submissionId": request.submissionId,
                    "category": category,
                })
                return ClassifyResponse(
                    submissionId=request.submissionId,
                    primaryCategory=category or "unknown",
                    confidence=0.0,
                    hazardFlag=True,
                    needsFollowup=False,
                )
            
            # Step 6: followup_decision
            needs_followup = confidence < self.confidence_threshold
            followup_question = None
            if needs_followup:
                followup_question = self._generate_followup_question(category)
            
            logger.info("Classification complete", extra={
                "submissionId": request.submissionId,
                "category": category,
                "confidence": confidence,
                "hazardFlag": hazard_flag,
                "needsFollowup": needs_followup,
                "latency_ms": int((time.time() - start_time) * 1000),
            })
            
            return ClassifyResponse(
                submissionId=request.submissionId,
                primaryCategory=category,
                subtype=subtype,
                estimatedComposition=composition,
                confidence=confidence,
                hazardFlag=hazard_flag,
                needsFollowup=needs_followup,
                followupQuestion=followup_question,
            )
        
        except Exception as e:
            logger.error("Classification failed", extra={
                "submissionId": request.submissionId,
                "error": str(e),
                "latency_ms": int((time.time() - start_time) * 1000),
            })
            # Fail-safe: return low confidence with hazard flag
            return ClassifyResponse(
                submissionId=request.submissionId,
                primaryCategory="unknown",
                confidence=0.0,
                hazardFlag=True,
                needsFollowup=False,
            )
    
    def _parse_input(self, description: str, photo_refs: list[str] | None) -> str:
        """Normalize raw text and photo descriptions."""
        # Phase 1a: simple concatenation; real implementation would parse photos
        result = description or ""
        if photo_refs:
            result += " [PHOTO_PRESENT]"
        return result.lower().strip()
    
    def _classify_category(self, parsed_text: str) -> tuple[str, str | None]:
        """Closed-set classification against 6 categories."""
        # Phase 1a: keyword-based mock; real implementation uses LLM
        keywords_map = {
            "organic_biomass": ["food", "scrap", "grain", "ground", "compost", "coffee", "vegetable"],
            "cardboard_paper": ["cardboard", "paper", "box", "packaging", "offset"],
            "used_cooking_oil": ["oil", "fryer", "grease", "kitchen"],
            "textile_offcuts": ["fabric", "textile", "cloth", "fiber", "scrap"],
            "wood_pallets_untreated": ["pallet", "wood", "wooden", "crate", "lumber"],
            "packaging_plastic": ["plastic", "film", "bottle", "wrap", "clean"],
        }
        
        # Score each category
        scores = {}
        for category, keywords in keywords_map.items():
            score = sum(1 for kw in keywords if kw in parsed_text)
            scores[category] = score
        
        # Return highest scoring category (or unknown if no matches)
        best_category = max(scores, key=scores.get) if any(scores.values()) else "unknown"
        best_score = scores.get(best_category, 0)
        
        return best_category if best_score > 0 else "unknown", None
    
    def _estimate_composition(self, category: str, parsed_text: str) -> dict | None:
        """Estimate material composition properties."""
        if category == "organic_biomass":
            return {
                "nitrogen_percent": 2.5,
                "carbon_percent": 45.0,
                "moisture_percent": 75,
            }
        return None
    
    def _compute_confidence(self, category: str, has_photo: bool, clarity_score: float) -> float:
        """Compute confidence score based on signals."""
        base_confidence = 0.6 if category != "unknown" else 0.2
        
        if has_photo:
            base_confidence += 0.2
        
        base_confidence += clarity_score * 0.2
        
        return min(max(base_confidence, 0.0), 1.0)  # Clamp to [0, 1]
    
    def _assess_clarity(self, text: str) -> float:
        """Assess text clarity (very basic)."""
        # Higher score for longer, more detailed descriptions
        word_count = len(text.split())
        return min(word_count / 50.0, 1.0)
    
    def _generate_followup_question(self, category: str) -> str:
        """Generate one clarifying followup question."""
        questions = {
            "organic_biomass": "Can you clarify whether this material contains any food contamination or hazardous additives?",
            "cardboard_paper": "Is all the cardboard/paper clean and free of plastic coating?",
            "used_cooking_oil": "Is this oil clean and free of water or food particles?",
            "textile_offcuts": "Are these textile offcuts natural fibers (cotton, wool) or synthetic?",
            "wood_pallets_untreated": "Are these pallets untreated wood, or do they have any chemical treatment?",
            "packaging_plastic": "Is this plastic clean, non-food-contaminated, and free of labels?",
            "unknown": "Can you provide more details about what material this is?",
        }
        return questions.get(category, "Can you provide more information?")


scout_agent = ScoutAgent()

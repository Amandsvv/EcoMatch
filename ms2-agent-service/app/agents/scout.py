"""Scout Agent - Material Classification."""

import os
from app.models import ClassifyRequest, ClassifyResponse
from app.reference_data.categories import get_all_categories, get_category
from app.logger import logger
from app.llm import LLMConfigurationError, LLMResponseError, llm_client
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
            
            # Step 2: classify_category (LLM closed-set; local fallback if not configured)
            category, subtype, llm_confidence, composition = await self._classify_category(
                request,
                parsed_text,
            )
            
            # Step 3: estimate_composition
            if composition is None:
                composition = self._estimate_composition(category, parsed_text)
            
            # Step 4: compute_confidence
            confidence = llm_confidence
            if confidence is None:
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
    
    async def _classify_category(
        self,
        request: ClassifyRequest,
        parsed_text: str,
    ) -> tuple[str, str | None, float | None, dict | None]:
        """Closed-set classification against the allowed categories."""
        try:
            result = await self._classify_category_with_llm(request)
            category = str(result.get("primaryCategory", "unknown"))
            subtype = result.get("subtype")
            confidence = self._coerce_confidence(result.get("confidence"))
            composition = result.get("estimatedComposition")
            if not isinstance(composition, dict):
                composition = None
            return category, subtype, confidence, composition
        except (LLMConfigurationError, LLMResponseError) as exc:
            logger.info("Using local Scout fallback", extra={
                "submissionId": request.submissionId,
                "reason": str(exc),
            })
            category, subtype = self._classify_category_fallback(parsed_text)
            return category, subtype, None, None

    async def _classify_category_with_llm(self, request: ClassifyRequest) -> dict:
        categories = {
            name: get_category(name)["description"]
            for name in self.categories
            if get_category(name)
        }
        system_prompt = (
            "You are EcoMatch's Scout Agent. Classify business waste submissions into "
            "exactly one allowed category or unknown. Use only the supplied category list. "
            "Do not decide hazard safety; the application will do that deterministically. "
            "If the material is toxic, chemical, medical, electronic, contaminated, or not "
            "clearly one allowed category, return primaryCategory as unknown with low confidence."
        )
        return await llm_client.complete_json(
            system_prompt=system_prompt,
            operation="scout_classification",
            user_payload={
                "submissionId": request.submissionId,
                "rawDescription": request.rawDescription,
                "photoRefs": request.photoRefs or [],
                "allowedCategories": categories,
                "disposalCostPerUnit": request.disposalCostPerUnit,
                "disposalFrequency": request.disposalFrequency,
            },
            response_schema={
                "primaryCategory": "one of allowed category keys or unknown",
                "subtype": "short string or null",
                "estimatedComposition": "object or null",
                "confidence": "number from 0.0 to 1.0",
            },
        )

    def _classify_category_fallback(self, parsed_text: str) -> tuple[str, str | None]:
        """Closed-set classification against 6 categories."""
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

    def _coerce_confidence(self, value) -> float | None:
        """Clamp model confidence into [0, 1]."""
        try:
            confidence = float(value)
        except (TypeError, ValueError):
            return None
        return min(max(confidence, 0.0), 1.0)
    
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


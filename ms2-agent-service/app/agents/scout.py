"""Scout Agent - Material Classification.

All major decisions (classification, composition estimation, confidence,
hazard determination, followup question generation) are driven by the LLM
via a single structured call. The only hard guarantee remaining in Python code
is the post-LLM fail-safe: if the returned category is not in the allowed set,
hazardFlag is forced True regardless of what the model said — fail-safe, not
fail-open.
"""

import os
import time
from app.models import ClassifyRequest, ClassifyResponse
from app.reference_data.categories import get_all_categories, get_category
from app.logger import logger
from app.llm import llm_client


class ScoutAgent:
    """Scout Agent for material classification and hazard detection.

    All decisions — category, composition, confidence, hazard, followup —
    are driven by a single LLM call (token-efficient, holistic reasoning).
    The only hard Python guarantee: if the LLM returns a category not in the
    allowed set, hazardFlag is forced True — fail-safe, not fail-open.
    """

    def __init__(self):
        self.confidence_threshold = float(os.getenv("SCOUT_CONFIDENCE_THRESHOLD", "0.7"))
        self.categories = get_all_categories()
    
    async def classify(self, request: ClassifyRequest) -> ClassifyResponse:
        """
        Classify material submission — fully LLM-driven pipeline.

        Pipeline (all handled inside one LLM call for efficiency):
        1. parse_input        — lightweight normalization before LLM
        2. llm_full_classify  — LLM decides: category, subtype, composition,
                                confidence, hazardFlag, needsFollowup, followupQuestion
        3. fail_safe_override — Python enforces: non-allowed category → hazardFlag=True
        """
        start_time = time.time()

        try:
            # Step 1: parse_input — lightweight, no decisions made here
            parsed_text = self._parse_input(request.rawDescription, request.photoRefs)

            # Steps 2–6: single LLM call covering all Scout decisions
            result = await self._llm_full_classify(request, parsed_text)

            primary_category = str(result.get("primaryCategory", "unknown"))
            subtype = result.get("subtype") or None
            composition = result.get("estimatedComposition")
            if not isinstance(composition, dict):
                composition = None
            confidence = self._coerce_confidence(result.get("confidence"))
            hazard_flag = bool(result.get("hazardFlag", False))
            needs_followup = bool(result.get("needsFollowup", False))
            followup_question = result.get("followupQuestion") or None

            # Step 3: fail-safe override — Python enforces the hard rule
            # If the LLM returned a category outside the allowed set, force hazardous.
            if primary_category not in self.categories:
                hazard_flag = True

            if hazard_flag:
                logger.info("Hazard flag set", extra={
                    "submissionId": request.submissionId,
                    "category": primary_category,
                    "llm_flagged": bool(result.get("hazardFlag")),
                })
                return ClassifyResponse(
                    submissionId=request.submissionId,
                    primaryCategory=primary_category or "unknown",
                    confidence=0.0,
                    hazardFlag=True,
                    needsFollowup=False,
                )

            logger.info("Classification complete", extra={
                "submissionId": request.submissionId,
                "category": primary_category,
                "confidence": confidence,
                "hazardFlag": hazard_flag,
                "needsFollowup": needs_followup,
                "latency_ms": int((time.time() - start_time) * 1000),
            })

            return ClassifyResponse(
                submissionId=request.submissionId,
                primaryCategory=primary_category,
                subtype=subtype,
                estimatedComposition=composition,
                confidence=confidence,
                hazardFlag=hazard_flag,
                needsFollowup=needs_followup,
                followupQuestion=followup_question if needs_followup else None,
            )

        except Exception as e:
            logger.error("Classification failed", extra={
                "submissionId": request.submissionId,
                "error": str(e),
                "latency_ms": int((time.time() - start_time) * 1000),
            })
            # Fail-safe: unknown material → treat as hazardous
            return ClassifyResponse(
                submissionId=request.submissionId,
                primaryCategory="unknown",
                confidence=0.0,
                hazardFlag=True,
                needsFollowup=False,
            )
    
    def _parse_input(self, description: str, photo_refs: list[str] | None) -> str:
        """Lightweight normalization — no decisions made here, just formatting for the LLM."""
        result = description or ""
        if photo_refs:
            result += f" [PHOTOS: {', '.join(photo_refs)}]"
        return result.strip()

    async def _llm_full_classify(self, request: ClassifyRequest, parsed_text: str) -> dict:
        """
        Single LLM call covering ALL Scout pipeline decisions:
          - Closed-set category classification
          - Estimated material composition
          - Calibrated confidence score (0.0–1.0)
          - Hazard determination (true/false)
          - Whether a followup question is needed, and exactly what it should say

        Using one combined call keeps token usage controlled while allowing the LLM
        to reason holistically over all signals at once rather than in fragmented steps.
        """
        categories = {
            name: get_category(name)["description"]
            for name in self.categories
            if get_category(name)
        }

        system_prompt = (
            "You are EcoMatch's Scout Agent. Your job is to analyze a business waste submission "
            "and make ALL of the following decisions in one response.\n\n"
            "ALLOWED CATEGORIES (use the exact key names):\n"
            + "\n".join(f"  - {k}: {v}" for k, v in categories.items())
            + "\n\n"
            "DECISION RULES — follow each one exactly:\n"
            "1. primaryCategory: Choose exactly one key from the allowed list above, or 'unknown' "
            "if the material clearly does not match any.\n"
            "2. subtype: A short, specific descriptor within the chosen category "
            "(e.g. 'spent grain', 'LDPE film', 'heat-treated pallet') — or null if not determinable.\n"
            "3. estimatedComposition: For organic/biomass materials only, return a JSON object with "
            "nitrogen_percent, carbon_percent, and moisture_percent as your best estimate. "
            "For all other categories, return null.\n"
            "4. confidence: A calibrated float from 0.0 to 1.0 reflecting how certain you are that "
            "primaryCategory is correct, given the description quality, photo presence, and specificity.\n"
            "5. hazardFlag: Set to true if the material is toxic, chemical, medical, electronic, "
            "radioactive, clearly contaminated, or does not fit any of the six allowed categories. "
            "Also set to true if you are genuinely uncertain whether it is safe — fail-safe, not "
            "fail-open. When in doubt, flag it.\n"
            "6. needsFollowup: Set to true ONLY if confidence < 0.7 AND the submission has not had "
            "a prior followup round (priorFollowupAsked will tell you). Never request more than one "
            "followup round total.\n"
            "7. followupQuestion: If needsFollowup is true, write exactly one specific, concise question "
            "that would resolve your uncertainty about the material category or safety. "
            "If needsFollowup is false, return null.\n\n"
            "Be decisive. Do not hedge. If you cannot classify with confidence, set hazardFlag=true "
            "rather than guessing a category."
        )

        return await llm_client.complete_json(
            system_prompt=system_prompt,
            operation="scout_full_classify",
            user_payload={
                "submissionId": request.submissionId,
                "description": parsed_text,
                "photoRefs": request.photoRefs or [],
                "disposalCostPerUnit": request.disposalCostPerUnit,
                "disposalFrequency": request.disposalFrequency,
                "priorFollowupAsked": False,
            },
            response_schema={
                "primaryCategory": "one of the six allowed category keys, or 'unknown'",
                "subtype": "short specific descriptor string, or null",
                "estimatedComposition": (
                    "object with nitrogen_percent, carbon_percent, moisture_percent — or null"
                ),
                "confidence": "float 0.0 to 1.0",
                "hazardFlag": "boolean",
                "needsFollowup": "boolean",
                "followupQuestion": "string — one clarifying question, or null",
            },
        )

    def _coerce_confidence(self, value) -> float:
        """Clamp LLM confidence output into [0, 1]; default 0.0 on parse failure."""
        try:
            return min(max(float(value), 0.0), 1.0)
        except (TypeError, ValueError):
            return 0.0


scout_agent = ScoutAgent()

"""Negotiator Agent - In-Platform Proposal Drafting.

All proposal content, term determination, and tone verification are driven
by the LLM. The agent never sends anything — it only returns drafts for
in-platform display. Contact details are never included in prompts or output.
"""

import os
from app.models import DraftRequest, DraftResponse
from app.reference_data.categories import get_category, get_market_price
from app.logger import logger
from app.llm import LLMConfigurationError, LLMResponseError, llm_client
import time


class NegotiatorAgent:
    """Negotiator Agent for drafting in-platform proposals.

    Pipeline:
    1. llm_determine_terms    — LLM reasons about appropriate price/frequency/contract
                                 from reference data and deal context
    2. draft_source_message   — LLM call with tone-controlled system prompt
    3. draft_target_message   — same, personalized to target business
    4. llm_check_tone         — LLM verifies drafts don't overpromise, bind, or
                                 include contact info; regenerates once if needed

    CRITICAL: Never includes contact info. Only for dashboard display. Never sends.
    """

    def __init__(self):
        self.max_tone_regen_attempts = int(os.getenv("NEGOTIATOR_MAX_TONE_REGEN", "2"))
    
    async def draft(self, request: DraftRequest) -> DraftResponse:
        """
        Draft two proposals for in-platform display.
        
        Pipeline:
        1. determine_terms - compute price/frequency from reference data
        2. draft_source_message - LLM call (warm, specific, no pressure)
        3. draft_target_message - personalized to target business
        4. self_check_tone - verify drafts don't overpromise/bind
        
        CRITICAL: Never includes contact info. Only for dashboard display.
        """
        start_time = time.time()
        
        try:
            # Step 1: llm_determine_terms — LLM reasons about fair terms from context
            terms = await self._llm_determine_terms(request.match)

            # Step 2: draft_source_message
            source_draft = await self._draft_source_message(
                request.sourceBusiness,
                request.targetBusiness,
                request.match,
                terms,
            )

            # Step 3: draft_target_message
            target_draft = await self._draft_target_message(
                request.targetBusiness,
                request.sourceBusiness,
                request.match,
                terms,
            )

            # Step 4: llm_check_tone — LLM verifies tone, regenerates once if needed
            needs_manual_rewrite = False
            for attempt in range(self.max_tone_regen_attempts):
                source_tone_ok = await self._llm_check_tone(source_draft)
                target_tone_ok = await self._llm_check_tone(target_draft)

                if source_tone_ok and target_tone_ok:
                    break

                logger.warning("LLM tone check failed; regenerating", extra={
                    "matchId": request.match.get("id"),
                    "attempt": attempt + 1,
                })

                if attempt < self.max_tone_regen_attempts - 1:
                    if not source_tone_ok:
                        source_draft = await self._draft_source_message(
                            request.sourceBusiness, request.targetBusiness,
                            request.match, terms, stricter=True,
                        )
                    if not target_tone_ok:
                        target_draft = await self._draft_target_message(
                            request.targetBusiness, request.sourceBusiness,
                            request.match, terms, stricter=True,
                        )
                else:
                    needs_manual_rewrite = True

            logger.info("Drafts created", extra={
                "matchId": request.match.get("id"),
                "latency_ms": int((time.time() - start_time) * 1000),
            })

            return DraftResponse(
                sourceDraft={
                    "message": source_draft,
                    "terms": terms,
                    "needsManualRewrite": needs_manual_rewrite,
                },
                targetDraft={
                    "message": target_draft,
                    "terms": terms,
                    "needsManualRewrite": needs_manual_rewrite,
                },
            )
        
        except Exception as e:
            logger.error("Draft creation failed", extra={
                "matchId": request.match.get("id"),
                "error": str(e),
                "latency_ms": int((time.time() - start_time) * 1000),
            })
            raise
    
    async def _llm_determine_terms(self, match: dict) -> dict:
        """
        LLM decides the proposed deal terms from reference data and context.
        Replaces the previous hardcoded 15% discount formula and 12-month default.
        """
        category = match.get("classification", {}).get("primaryCategory", "unknown")
        market_price = get_market_price(category)
        category_info = get_category(category) or {}

        result = await llm_client.complete_json(
            system_prompt=(
                "You are EcoMatch's Negotiator Agent determining fair deal terms for a waste "
                "material match. Use the provided reference data to set a proposed price that "
                "undercuts the source's disposal cost while being fair to the target. "
                "Choose a realistic contract length and frequency. "
                "Do not invent numbers — reason from the facts provided."
            ),
            operation="negotiator_determine_terms",
            user_payload={
                "primaryCategory": category,
                "categoryDescription": category_info.get("description", ""),
                "marketPricePerTon": market_price,
                "matchRationale": match.get("matchRationale", ""),
                "estimatedSourceSavings": match.get("estimatedSourceSavings"),
                "estimatedTargetSavingsPct": match.get("estimatedTargetSavingsPct"),
            },
            response_schema={
                "pricePerUnit": "proposed price per unit (float)",
                "frequency": "pickup/delivery frequency string (e.g. 'monthly', 'weekly')",
                "contractLengthMonths": "integer, e.g. 6 or 12",
                "startDate": "string, e.g. 'to be confirmed'",
                "notes": "short notes string about quality expectations",
            },
        )
        # Ensure required keys with sensible defaults if LLM omits any
        return {
            "pricePerUnit": float(result.get("pricePerUnit") or market_price * 0.85),
            "frequency": str(result.get("frequency") or "monthly"),
            "contractLengthMonths": int(result.get("contractLengthMonths") or 12),
            "startDate": str(result.get("startDate") or "to be confirmed"),
            "notes": str(result.get("notes") or "Subject to material inspection and quality verification"),
        }
    
    async def _draft_source_message(
        self,
        source_business: dict,
        target_business: dict,
        match: dict,
        terms: dict,
        stricter: bool = False,
    ) -> str:
        """Draft message for source business using the LLM."""
        return await self._draft_message(
            audience_role="source_business",
            audience_business=source_business,
            counterpart_business=target_business,
            match=match,
            terms=terms,
            stricter=stricter,
        )

    async def _draft_target_message(
        self,
        target_business: dict,
        source_business: dict,
        match: dict,
        terms: dict,
        stricter: bool = False,
    ) -> str:
        """Draft message for target business using the LLM."""
        return await self._draft_message(
            audience_role="target_business",
            audience_business=target_business,
            counterpart_business=source_business,
            match=match,
            terms=terms,
            stricter=stricter,
        )

    async def _draft_message(
        self,
        audience_role: str,
        audience_business: dict,
        counterpart_business: dict,
        match: dict,
        terms: dict,
        stricter: bool = False,
    ) -> str:
        """Ask the LLM for an in-platform proposal message."""
        audience_name = audience_business.get("name", "Partner")
        counterpart_name = counterpart_business.get("name", "potential partner")
        safe_payload = {
            "audienceRole": audience_role,
            "audienceBusiness": {"name": audience_name},
            "counterpartBusiness": {"name": counterpart_name},
            "match": {
                "id": match.get("id"),
                "classification": match.get("classification"),
                "targetBusinessId": match.get("targetBusinessId"),
                "matchRationale": match.get("matchRationale"),
            },
            "terms": terms,
            "stricterTonePass": stricter,
        }
        try:
            result = await llm_client.complete_json(
                system_prompt=(
                    "You are EcoMatch's Negotiator Agent. Draft a warm, specific, non-pushy "
                    "dashboard proposal for the logged-in business. The message is for in-platform "
                    "display only. Do not include phone numbers, email addresses, physical addresses, "
                    "or any contact details. Do not imply the deal is confirmed, binding, guaranteed, "
                    "required, or already accepted by the other party. Clearly frame it as a proposal "
                    "the current business can accept or reject."
                ),
                operation=f"negotiator_{audience_role}_draft",
                user_payload=safe_payload,
                response_schema={"message": "dashboard proposal message string"},
            )
            message = result.get("message")
            if isinstance(message, str) and message.strip():
                return message.strip()
            raise LLMResponseError("message missing")
        except (LLMConfigurationError, LLMResponseError) as exc:
            logger.info("Using local Negotiator draft fallback", extra={
                "audienceRole": audience_role,
                "reason": str(exc),
            })
            return self._draft_message_fallback(audience_role, audience_name, counterpart_name, terms)

    def _draft_message_fallback(
        self,
        audience_role: str,
        audience_name: str,
        counterpart_name: str,
        terms: dict,
    ) -> str:
        """Local draft for development when no LLM is configured."""
        if audience_role == "source_business":
            relationship = (
                f"We've identified {counterpart_name} as a potential recipient for your material. "
                "They operate in a compatible line of work and may benefit from your supply."
            )
        else:
            relationship = (
                f"We've identified {counterpart_name} as a potential supplier for material that may "
                "match your operations."
            )

        return (
            f"Hello {audience_name},\n\n"
            f"{relationship}\n\n"
            f"Proposed terms:\n"
            f"- Price: ${terms['pricePerUnit']:.2f} per unit\n"
            f"- Frequency: {terms['frequency']}\n"
            f"- Contract length: {terms['contractLengthMonths']} months\n\n"
            "If this looks useful, you can review and accept this proposal in your dashboard. "
            "The arrangement moves forward only after both businesses accept.\n\n"
            "EcoMatch Team"
        )

    async def _llm_check_tone(self, draft_message: str) -> bool:
        """
        LLM verifies the draft doesn't overpromise, bind, or include contact details.
        Returns True if tone is acceptable, False if regeneration is needed.
        Replaces the previous keyword-checklist approach.
        """
        result = await llm_client.complete_json(
            system_prompt=(
                "You are a quality reviewer for EcoMatch proposal drafts. "
                "Review the provided draft message and check ALL of the following:\n"
                "1. Does it contain pressure language? (e.g. 'must', 'required', 'guaranteed', 'binding')\n"
                "2. Does it imply the deal is already confirmed or that the other party has already agreed?\n"
                "3. Does it contain any contact information? (phone numbers, email addresses, "
                "physical addresses, URLs to contact pages)\n"
                "4. Does it frame itself clearly as a PROPOSAL that the logged-in business can accept or reject?\n\n"
                "Return toneOk=true ONLY if: no pressure language, no false confirmations, "
                "no contact details, and it clearly reads as a proposal awaiting decision. "
                "Return toneOk=false otherwise, with a brief reason."
            ),
            operation="negotiator_tone_check",
            user_payload={"draftMessage": draft_message},
            response_schema={
                "toneOk": "boolean — true if tone is acceptable",
                "reason": "brief explanation if toneOk is false, else null",
            },
        )
        tone_ok = bool(result.get("toneOk", False))
        if not tone_ok:
            logger.info("Tone check failed", extra={"reason": result.get("reason")})
        return tone_ok


negotiator_agent = NegotiatorAgent()

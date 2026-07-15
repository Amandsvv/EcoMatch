"""Negotiator Agent - In-Platform Proposal Drafting."""

import os
from app.models import DraftRequest, DraftResponse
from app.reference_data.categories import get_category, get_market_price
from app.logger import logger
from app.llm import LLMConfigurationError, LLMResponseError, llm_client
import time


class NegotiatorAgent:
    """Negotiator Agent for drafting in-platform proposals."""
    
    def __init__(self):
        self.discount_margin = 0.15  # 15% discount from market price
        self.contract_length_months = 12
    
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
            # Step 1: determine_terms
            terms = self._determine_terms(request.match)
            
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
            
            # Step 4: self_check_tone
            tone_ok_source = self._check_tone(source_draft)
            tone_ok_target = self._check_tone(target_draft)
            
            needs_manual_rewrite = False
            if not (tone_ok_source and tone_ok_target):
                logger.warning("Tone check failed; retrying draft once", extra={
                    "matchId": request.match.get("id"),
                    "source_tone_ok": tone_ok_source,
                    "target_tone_ok": tone_ok_target,
                })
                source_draft = await self._draft_source_message(
                    request.sourceBusiness,
                    request.targetBusiness,
                    request.match,
                    terms,
                    stricter=True,
                )
                target_draft = await self._draft_target_message(
                    request.targetBusiness,
                    request.sourceBusiness,
                    request.match,
                    terms,
                    stricter=True,
                )
                tone_ok_source = self._check_tone(source_draft)
                tone_ok_target = self._check_tone(target_draft)
                needs_manual_rewrite = not (tone_ok_source and tone_ok_target)
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
    
    def _determine_terms(self, match: dict) -> dict:
        """Compute proposed terms from reference data."""
        category = match.get("classification", {}).get("primaryCategory", "unknown")
        market_price = get_market_price(category)
        
        # Apply discount to market price
        proposed_price = market_price * (1.0 - self.discount_margin)
        
        return {
            "pricePerUnit": proposed_price,
            "frequency": "monthly",
            "contractLengthMonths": self.contract_length_months,
            "startDate": "to be confirmed",
            "notes": "Subject to material inspection and quality verification",
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

    def _check_tone(self, draft_message: str) -> bool:
        """
        Verify draft doesn't overpromise, doesn't bind, reads as proposal.
        
        Simple rule-based checks for Phase 1a.
        """
        # Check for pressure language
        pressure_words = ["must", "required", "binding", "guaranteed", "confirmed"]
        for word in pressure_words:
            if word.lower() in draft_message.lower():
                return False
        
        # Check for contact info (should never appear)
        contact_indicators = ["phone", "call me", "email:", "@", "address"]
        for indicator in contact_indicators:
            if indicator.lower() in draft_message.lower():
                return False
        
        # Check for "both parties have agreed" language (shouldn't exist)
        if "already agreed" in draft_message.lower() or "confirmed" in draft_message.lower():
            if "once" not in draft_message.lower():  # "once both parties accept" is OK
                return False
        
        return True


negotiator_agent = NegotiatorAgent()



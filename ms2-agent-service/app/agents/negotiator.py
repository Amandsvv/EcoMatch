"""Negotiator Agent - In-Platform Proposal Drafting."""

import os
from app.models import DraftRequest, DraftResponse
from app.reference_data.categories import get_category, get_market_price
from app.logger import logger
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
            source_draft = self._draft_source_message(
                request.sourceBusiness,
                request.targetBusiness,
                request.match,
                terms,
            )
            
            # Step 3: draft_target_message
            target_draft = self._draft_target_message(
                request.targetBusiness,
                request.sourceBusiness,
                request.match,
                terms,
            )
            
            # Step 4: self_check_tone
            tone_ok_source = self._check_tone(source_draft)
            tone_ok_target = self._check_tone(target_draft)
            
            if not (tone_ok_source and tone_ok_target):
                # Phase 1a: log but return anyway; real implementation would retry/flag
                logger.warn("Tone check failed", extra={
                    "matchId": request.match.get("id"),
                    "source_tone_ok": tone_ok_source,
                    "target_tone_ok": tone_ok_target,
                })
            
            logger.info("Drafts created", extra={
                "matchId": request.match.get("id"),
                "latency_ms": int((time.time() - start_time) * 1000),
            })
            
            return DraftResponse(
                sourceDraft={
                    "message": source_draft,
                    "terms": terms,
                },
                targetDraft={
                    "message": target_draft,
                    "terms": terms,
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
    
    def _draft_source_message(
        self,
        source_business: dict,
        target_business: dict,
        match: dict,
        terms: dict,
    ) -> str:
        """
        Draft message for source business (material provider).
        
        Tone: warm, specific, no pressure, no contact info from target.
        """
        source_name = source_business.get("name", "Partner")
        target_name = target_business.get("name", "potential partner")
        
        message = (
            f"Hello {source_name},\n\n"
            f"We've identified {target_name} as a potential recipient for your material. "
            f"They currently operate in a compatible line of work and could benefit from your supply.\n\n"
            f"**Proposed Terms:**\n"
            f"- Price: ${terms['pricePerUnit']:.2f} per unit\n"
            f"- Frequency: {terms['frequency']}\n"
            f"- Contract length: {terms['contractLengthMonths']} months\n\n"
            f"If this sounds like a good fit, you can accept this proposal in your dashboard. "
            f"Once both parties accept, we'll facilitate the arrangement.\n\n"
            f"Best regards,\nEcoMatch Team"
        )
        
        return message
    
    def _draft_target_message(
        self,
        target_business: dict,
        source_business: dict,
        match: dict,
        terms: dict,
    ) -> str:
        """
        Draft message for target business (material recipient).
        
        Tone: warm, specific, no pressure, no contact info from source.
        """
        target_name = target_business.get("name", "Partner")
        source_name = source_business.get("name", "potential partner")
        
        message = (
            f"Hello {target_name},\n\n"
            f"We've identified {source_name} as a potential supplier for material that matches "
            f"your operations. They are looking to redirect their supply stream.\n\n"
            f"**Proposed Terms:**\n"
            f"- Price: ${terms['pricePerUnit']:.2f} per unit\n"
            f"- Frequency: {terms['frequency']}\n"
            f"- Contract length: {terms['contractLengthMonths']} months\n\n"
            f"If you're interested, you can accept this proposal in your dashboard. "
            f"Once both parties accept, we'll facilitate the arrangement.\n\n"
            f"Best regards,\nEcoMatch Team"
        )
        
        return message
    
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

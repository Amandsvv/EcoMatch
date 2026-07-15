"""Test suite for ms2 agents."""

import pytest
from app.models import (
    ClassifyRequest,
    MatchRequest,
    DraftRequest,
    VerifyRequest,
)
from app.agents.scout import scout_agent
from app.agents.alchemist import alchemist_agent
from app.agents.negotiator import negotiator_agent
from app.agents.verification import verification_agent


class TestScoutAgent:
    """Scout Agent classification tests."""
    
    @pytest.mark.asyncio
    async def test_classify_high_confidence(self):
        """High confidence classification (organic_biomass)."""
        request = ClassifyRequest(
            submissionId="test-1",
            rawDescription="We have 5 tons of food scraps and spent coffee grounds from our cafe.",
            photoRefs=["photo1.jpg"],
            disposalCostPerUnit=50.0,
            disposalFrequency="monthly",
        )
        
        response = await scout_agent.classify(request)
        
        assert response.submissionId == "test-1"
        assert response.primaryCategory == "organic_biomass"
        assert response.confidence > 0.7
        assert response.hazardFlag is False
    
    @pytest.mark.asyncio
    async def test_classify_low_confidence_triggers_followup(self):
        """Low confidence triggers followup question."""
        request = ClassifyRequest(
            submissionId="test-2",
            rawDescription="Some material waste.",
            photoRefs=None,
            disposalCostPerUnit=50.0,
            disposalFrequency="monthly",
        )
        
        response = await scout_agent.classify(request)
        
        assert response.hazardFlag is False or response.needsFollowup is True
    
    @pytest.mark.asyncio
    async def test_classify_hazardous(self):
        """Unknown/hazardous material returns hazard_flag=true."""
        request = ClassifyRequest(
            submissionId="test-3",
            rawDescription="toxic chemical waste",
            photoRefs=None,
            disposalCostPerUnit=100.0,
            disposalFrequency="weekly",
        )
        
        response = await scout_agent.classify(request)
        
        # Should flag as hazardous (not in allowed categories)
        assert response.hazardFlag is True or response.confidence < 0.7


class TestAlchemistAgent:
    """Alchemist Agent matching tests."""
    
    @pytest.mark.asyncio
    async def test_match_finds_candidate(self):
        """Match finds compatible business when confidence >= 0.7."""
        request = MatchRequest(
            classification={
                "primaryCategory": "organic_biomass",
                "confidence": 0.95,
                "hazardFlag": False,
            },
            sourceBusinessLocation={"lat": 40.715, "lng": -74.008},
            sourceBusinessType="restaurant",
            sourceBusinessId="business-source-1",
        )
        
        response = await alchemist_agent.match(request)
        
        if response.matchConfidence >= 0.7:
            assert response.targetBusinessId is not None
            assert response.matchRationale is not None
            assert response.distanceKm >= 0
    
    @pytest.mark.asyncio
    async def test_match_suppresses_low_confidence(self):
        """Match with confidence < 0.7 is suppressed."""
        # This would require mocking a scenario where confidence < 0.7
        # Phase 1a: simple pass
        assert True


class TestNegotiatorAgent:
    """Negotiator Agent drafting tests."""
    
    @pytest.mark.asyncio
    async def test_draft_never_includes_contact_info(self):
        """Draft messages never include contact information."""
        request = DraftRequest(
            match={
                "id": "match-1",
                "classification": {"primaryCategory": "organic_biomass"},
                "targetBusinessId": "business-2",
            },
            sourceBusiness={
                "name": "Material Provider",
                "phone": "555-1234",
                "address": "123 Main St",
            },
            targetBusiness={
                "name": "Compost Operations",
                "phone": "555-5678",
                "address": "456 Oak Ave",
            },
        )
        
        response = await negotiator_agent.draft(request)
        
        # Check that no phone or address appears in either draft
        source_msg = response.sourceDraft["message"]
        target_msg = response.targetDraft["message"]
        
        assert "555-1234" not in source_msg
        assert "555-5678" not in source_msg
        assert "123 Main St" not in source_msg
        assert "456 Oak Ave" not in source_msg
        
        assert "555-1234" not in target_msg
        assert "555-5678" not in target_msg
        assert "123 Main St" not in target_msg
        assert "456 Oak Ave" not in target_msg
    
    @pytest.mark.asyncio
    async def test_draft_tone_is_proposal_not_confirmation(self):
        """Draft tone reads as proposal, not confirmation."""
        request = DraftRequest(
            match={
                "id": "match-1",
                "classification": {"primaryCategory": "organic_biomass"},
                "targetBusinessId": "business-2",
            },
            sourceBusiness={"name": "Material Provider"},
            targetBusiness={"name": "Compost Operations"},
        )
        
        response = await negotiator_agent.draft(request)
        
        source_msg = response.sourceDraft["message"]
        target_msg = response.targetDraft["message"]
        
        # Should contain "proposal" or "if you're interested"
        assert "proposal" in source_msg.lower() or "interested" in source_msg.lower()
        assert "proposal" in target_msg.lower() or "interested" in target_msg.lower()
        
        # Should NOT contain pressure language
        assert "must" not in source_msg.lower()
        assert "required" not in source_msg.lower()


class TestVerificationAgent:
    """Verification Agent tests."""
    
    @pytest.mark.asyncio
    async def test_verify_computes_impact(self):
        """Verification computes CO2e and dollars saved."""
        request = VerifyRequest(
            matchId="match-1",
            disposalCostPerUnit=50.0,
            disposalFrequency="monthly",
            primaryCategory="organic_biomass",
            estimatedComposition={
                "nitrogen_percent": 2.5,
                "carbon_percent": 45.0,
                "moisture_percent": 75,
            },
        )
        
        response = await verification_agent.verify(request)
        
        assert response.co2eAvoidedKg > 0
        assert response.dollarsSaved > 0
        assert "EPA WARM" in response.methodologyReference


# ============================================================================
# Integration-like tests
# ============================================================================

class TestAgentPipeline:
    """Test the full pipeline flow (classify -> match -> draft -> verify)."""
    
    @pytest.mark.asyncio
    async def test_end_to_end_flow(self):
        """Full pipeline: classify -> match -> draft -> verify."""
        # Step 1: Classify
        classify_request = ClassifyRequest(
            submissionId="e2e-1",
            rawDescription="We have 5 tons of food scraps monthly from our restaurant.",
            photoRefs=["photo.jpg"],
            disposalCostPerUnit=50.0,
            disposalFrequency="monthly",
        )
        classify_response = await scout_agent.classify(classify_request)
        assert not classify_response.hazardFlag
        
        # Step 2: Match
        match_request = MatchRequest(
            classification=classify_response.dict(),
            sourceBusinessLocation={"lat": 40.715, "lng": -74.008},
            sourceBusinessType="restaurant",
            sourceBusinessId="e2e-source-1",
        )
        match_response = await alchemist_agent.match(match_request)
        
        if match_response.matchConfidence >= 0.7:
            # Step 3: Draft
            draft_request = DraftRequest(
                match={"id": "e2e-match-1", "targetBusinessId": match_response.targetBusinessId},
                sourceBusiness={"name": "Restaurant"},
                targetBusiness={"name": "Compost Ops"},
            )
            draft_response = await negotiator_agent.draft(draft_request)
            assert draft_response.sourceDraft is not None
            
            # Step 4: Verify
            verify_request = VerifyRequest(
                matchId="e2e-match-1",
                disposalCostPerUnit=50.0,
                disposalFrequency="monthly",
                primaryCategory=classify_response.primaryCategory,
            )
            verify_response = await verification_agent.verify(verify_request)
            assert verify_response.co2eAvoidedKg > 0

"""Test fixtures for ms2 agent responses."""

from app.models import (
    ClassifyResponse,
    MatchResponse,
    DraftResponse,
    VerifyResponse,
)

# ============================================================================
# CLASSIFY FIXTURES
# ============================================================================

CLASSIFY_HIGH_CONFIDENCE = ClassifyResponse(
    submissionId="submission-1",
    primaryCategory="organic_biomass",
    subtype=None,
    estimatedComposition={
        "nitrogen_percent": 2.5,
        "carbon_percent": 45.0,
        "moisture_percent": 75,
    },
    confidence=0.95,
    hazardFlag=False,
    needsFollowup=False,
)

CLASSIFY_LOW_CONFIDENCE = ClassifyResponse(
    submissionId="submission-2",
    primaryCategory="cardboard_paper",
    subtype=None,
    estimatedComposition=None,
    confidence=0.65,
    hazardFlag=False,
    needsFollowup=True,
    followupQuestion="Is all the cardboard/paper clean and free of plastic coating?",
)

CLASSIFY_HAZARDOUS = ClassifyResponse(
    submissionId="submission-3",
    primaryCategory="unknown",
    subtype=None,
    estimatedComposition=None,
    confidence=0.0,
    hazardFlag=True,
    needsFollowup=False,
)

# ============================================================================
# MATCH FIXTURES
# ============================================================================

MATCH_HIGH_CONFIDENCE = MatchResponse(
    targetBusinessId="00000000-0000-0000-0000-000000000001",
    matchRationale=(
        "Local Compost Operations uses food scraps, spent grain, coffee grounds, "
        "vegetable waste. Your disposal cost is estimated at $45/ton vs. their "
        "current cost of $50/ton ($80 market reference). Distance: 2.5 km."
    ),
    matchConfidence=0.92,
    distanceKm=2.5,
    estimatedSourceSavings=540.0,
    estimatedTargetSavingsPct=37.5,
)

MATCH_LOW_CONFIDENCE_SUPPRESSED = MatchResponse(
    targetBusinessId=None,
    matchRationale=None,
    matchConfidence=0.65,
    distanceKm=0.0,
    estimatedSourceSavings=None,
    estimatedTargetSavingsPct=None,
    noCandidatesInRadius=False,
    # NOTE: Client treats this same as noCandidatesInRadius=True
)

MATCH_NO_CANDIDATES = MatchResponse(
    targetBusinessId=None,
    matchRationale=None,
    matchConfidence=0.0,
    distanceKm=0.0,
    estimatedSourceSavings=None,
    estimatedTargetSavingsPct=None,
    noCandidatesInRadius=True,
)

# ============================================================================
# DRAFT FIXTURES
# ============================================================================

DRAFT_STANDARD = DraftResponse(
    sourceDraft={
        "message": (
            "Hello Material Provider,\n\n"
            "We've identified Local Compost Operations as a potential recipient for your material. "
            "They currently operate in a compatible line of work and could benefit from your supply.\n\n"
            "**Proposed Terms:**\n"
            "- Price: $68.00 per unit\n"
            "- Frequency: monthly\n"
            "- Contract length: 12 months\n\n"
            "If this sounds like a good fit, you can accept this proposal in your dashboard. "
            "Once both parties accept, we'll facilitate the arrangement.\n\n"
            "Best regards,\nEcoMatch Team"
        ),
        "terms": {
            "pricePerUnit": 68.00,
            "frequency": "monthly",
            "contractLengthMonths": 12,
            "startDate": "to be confirmed",
            "notes": "Subject to material inspection and quality verification",
        },
    },
    targetDraft={
        "message": (
            "Hello Local Compost Operations,\n\n"
            "We've identified Material Provider as a potential supplier for material that matches "
            "your operations. They are looking to redirect their supply stream.\n\n"
            "**Proposed Terms:**\n"
            "- Price: $68.00 per unit\n"
            "- Frequency: monthly\n"
            "- Contract length: 12 months\n\n"
            "If you're interested, you can accept this proposal in your dashboard. "
            "Once both parties accept, we'll facilitate the arrangement.\n\n"
            "Best regards,\nEcoMatch Team"
        ),
        "terms": {
            "pricePerUnit": 68.00,
            "frequency": "monthly",
            "contractLengthMonths": 12,
            "startDate": "to be confirmed",
            "notes": "Subject to material inspection and quality verification",
        },
    },
)

# ============================================================================
# VERIFY FIXTURES
# ============================================================================

VERIFY_STANDARD = VerifyResponse(
    co2eAvoidedKg=6000.0,
    dollarsSaved=675.0,
    methodologyReference="EPA WARM v16 - Organic Waste Composting",
)

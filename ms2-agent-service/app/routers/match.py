"""FastAPI routes for matching endpoint."""

from fastapi import APIRouter, HTTPException
from app.models import MatchRequest, MatchResponse
from app.agents.alchemist import alchemist_agent
from app.logger import logger

router = APIRouter(prefix="/match", tags=["match"])


@router.post("", response_model=MatchResponse)
async def match(request: MatchRequest) -> MatchResponse:
    """
    Alchemist Agent - Compatibility Matching.
    
    Finds a compatible nearby business for a classified material.
    
    Returns:
    - targetBusinessId + matchRationale if confidence >= 0.7
    - noCandidatesInRadius=true if confidence < 0.7 or no candidates
    
    Confidence < 0.7 is SUPPRESSED (not returned as a low-confidence result).
    """
    try:
        logger.info("Match request received", extra={
            "sourceBusinessId": request.sourceBusinessId,
            "category": request.classification.get("primaryCategory"),
        })
        
        response = await alchemist_agent.match(request)
        return response
    
    except Exception as e:
        logger.error("Match endpoint error", extra={
            "error": str(e),
        })
        raise HTTPException(status_code=500, detail="Matching failed")

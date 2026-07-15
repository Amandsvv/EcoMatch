"""FastAPI routes for draft endpoint."""

from fastapi import APIRouter, HTTPException
from app.models import DraftRequest, DraftResponse
from app.agents.negotiator import negotiator_agent
from app.logger import logger

router = APIRouter(prefix="/draft", tags=["draft"])


@router.post("", response_model=DraftResponse)
async def draft(request: DraftRequest) -> DraftResponse:
    """
    Negotiator Agent - In-Platform Proposal Drafting.
    
    Creates two proposals (one for each business) to display in their own dashboard.
    
    CRITICAL: Never includes contact info. Never implies the other party has accepted.
    This service does NOT send anything to anyone — only returns drafts for ms1 to display.
    """
    try:
        logger.info("Draft request received", extra={
            "matchId": request.match.get("id"),
        })
        
        response = await negotiator_agent.draft(request)
        return response
    
    except Exception as e:
        logger.error("Draft endpoint error", extra={
            "error": str(e),
        })
        raise HTTPException(status_code=500, detail="Draft creation failed")

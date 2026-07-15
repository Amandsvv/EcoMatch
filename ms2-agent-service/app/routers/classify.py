"""FastAPI routes for agent endpoints."""

from fastapi import APIRouter, HTTPException
from app.models import ClassifyRequest, ClassifyResponse
from app.agents.scout import scout_agent
from app.logger import logger

router = APIRouter(prefix="/classify", tags=["classify"])


@router.post("", response_model=ClassifyResponse)
async def classify(request: ClassifyRequest) -> ClassifyResponse:
    """
    Scout Agent - Material Classification.
    
    Classifies a material submission into one of 6 allowed categories.
    Returns hazard_flag=true if outside allowed categories or uncertain.
    
    Triggers a followup question if confidence < 0.7.
    """
    try:
        logger.info("Classify request received", extra={
            "submissionId": request.submissionId,
            "hasPhoto": bool(request.photoRefs),
        })
        
        response = await scout_agent.classify(request)
        return response
    
    except Exception as e:
        logger.error("Classify endpoint error", extra={
            "error": str(e),
        })
        raise HTTPException(status_code=500, detail="Classification failed")

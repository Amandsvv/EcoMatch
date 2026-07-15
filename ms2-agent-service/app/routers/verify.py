"""FastAPI routes for verify endpoint."""

from fastapi import APIRouter, HTTPException
from app.models import VerifyRequest, VerifyResponse
from app.agents.verification import verification_agent
from app.logger import logger

router = APIRouter(prefix="/verify", tags=["verify"])


@router.post("", response_model=VerifyResponse)
async def verify(request: VerifyRequest) -> VerifyResponse:
    """
    Verification Agent - Impact Calculation.
    
    Calculates CO2e avoided and dollars saved for a verified match.
    
    Called only after both verification_records are confirmed by ms1.
    """
    try:
        logger.info("Verify request received", extra={
            "matchId": request.matchId,
        })
        
        response = await verification_agent.verify(request)
        return response
    
    except Exception as e:
        logger.error("Verify endpoint error", extra={
            "error": str(e),
        })
        raise HTTPException(status_code=500, detail="Verification failed")

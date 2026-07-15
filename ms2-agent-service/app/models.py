"""Data models for agents."""

from pydantic import BaseModel, Field
from typing import Optional, Any
import json


class ClassifyRequest(BaseModel):
    """Scout Agent input."""
    submissionId: str
    rawDescription: str
    photoRefs: Optional[list[str]] = None
    disposalCostPerUnit: float
    disposalFrequency: str


class ClassifyResponse(BaseModel):
    """Scout Agent output."""
    submissionId: str
    primaryCategory: str
    subtype: Optional[str] = None
    estimatedComposition: Optional[dict[str, Any]] = None
    confidence: float
    hazardFlag: bool
    needsFollowup: bool = False
    followupQuestion: Optional[str] = None


class MatchRequest(BaseModel):
    """Alchemist Agent input."""
    classification: dict[str, Any]
    sourceBusinessLocation: dict[str, float]  # {"lat": float, "lng": float}
    sourceBusinessType: str
    sourceBusinessId: str


class MatchResponse(BaseModel):
    """Alchemist Agent output."""
    targetBusinessId: Optional[str] = None
    matchRationale: Optional[str] = None
    matchConfidence: float
    distanceKm: float = 0.0
    estimatedSourceSavings: Optional[float] = None
    estimatedTargetSavingsPct: Optional[float] = None
    noCandidatesInRadius: bool = False


class DraftRequest(BaseModel):
    """Negotiator Agent input."""
    match: dict[str, Any]
    sourceBusiness: dict[str, str]
    targetBusiness: dict[str, str]


class DraftResponse(BaseModel):
    """Negotiator Agent output."""
    sourceDraft: dict[str, Any]
    targetDraft: dict[str, Any]


class VerifyRequest(BaseModel):
    """Verification Agent input."""
    matchId: str
    disposalCostPerUnit: float
    disposalFrequency: str
    primaryCategory: str
    estimatedComposition: Optional[dict[str, Any]] = None


class VerifyResponse(BaseModel):
    """Verification Agent output."""
    co2eAvoidedKg: float
    dollarsSaved: float
    methodologyReference: str

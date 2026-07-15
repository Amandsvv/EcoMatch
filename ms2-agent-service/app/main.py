"""FastAPI application initialization."""

import os
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from app.routers import classify, match, draft, verify
from app.logger import logger

app = FastAPI(
    title="EcoMatch Agent Service (ms2)",
    description="FastAPI + LangGraph agents for material classification and matching",
    version="0.1.0",
)

# Include routers
app.include_router(classify.router)
app.include_router(match.router)
app.include_router(draft.router)
app.include_router(verify.router)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "ms2-agent-service"}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    logger.error("Unhandled exception", extra={
        "error": str(exc),
        "path": request.url.path,
    })
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )

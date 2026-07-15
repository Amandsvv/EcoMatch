"""Entry point for ms2-agent-service."""

import uvicorn
import os
import sys

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    
    print(f"Starting ms2-agent-service on port {port}...")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        log_level=log_level,
        reload=os.getenv("NODE_ENV") == "development",
    )

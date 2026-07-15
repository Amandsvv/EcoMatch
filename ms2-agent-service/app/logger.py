"""Logging configuration for ms2-agent-service."""

import logging
import os
from pythonjsonlogger import jsonlogger

def setup_logging():
    """Configure JSON logging."""
    log_level = os.getenv("LOG_LEVEL", "info").upper()
    
    # Create logger
    logger = logging.getLogger("ms2-agent-service")
    logger.setLevel(getattr(logging, log_level))
    
    # JSON handler
    handler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter(
        "%(timestamp)s %(level)s %(name)s %(message)s",
        timestamp=True
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger

logger = setup_logging()

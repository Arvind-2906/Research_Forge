"""ResearchForge AI Engine - Structured Logger.

Provides standardized logging formats with level control and context metadata.
"""

import json
import logging
import sys
from datetime import datetime, timezone

# Sensitive keys to sanitize from log records
REDACTED_KEYS = {
    "password",
    "token",
    "secret",
    "apikey",
    "api_key",
    "authorization",
    "client_secret",
}


def sanitize_dict(data: dict, depth: int = 0) -> dict:
    if depth > 4:
        return data
    sanitized = {}
    for k, v in data.items():
        if k.lower() in REDACTED_KEYS:
            sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = sanitize_dict(v, depth + 1)
        else:
            sanitized[k] = v
    return sanitized


class JSONFormatter(logging.Formatter):
    """Formats log records as structured JSON."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "ai-engine",
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }
        if hasattr(record, "meta") and isinstance(record.meta, dict):
            log_obj["meta"] = sanitize_dict(record.meta)
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj)


def setup_logger(name: str = "ai_engine") -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


logger = setup_logger()


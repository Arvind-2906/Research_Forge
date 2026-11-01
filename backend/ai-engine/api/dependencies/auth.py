"""ResearchForge AI Engine - Internal Service Authentication Dependency.

Secures internal FastAPI execution endpoints called by the Node.js backend.
"""

from fastapi import Header, HTTPException, status
from config.settings import get_settings


async def verify_internal_service_key(
    x_internal_service_key: str | None = Header(default=None, alias="X-Internal-Service-Key"),
):
    """Verifies that the caller possesses the shared internal service secret."""
    settings = get_settings()
    expected_secret = settings.INTERNAL_SERVICE_SECRET

    if not x_internal_service_key or x_internal_service_key != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid or missing internal service credentials.",
        )
    return True


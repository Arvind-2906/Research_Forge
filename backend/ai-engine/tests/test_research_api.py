"""Tests for Research Internal Endpoints & Authorization.
"""

import sys
import asyncio
import pytest
import httpx
from httpx import ASGITransport

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from main import app
from config.settings import get_settings


@pytest.mark.asyncio
async def test_endpoint_unauthorized_without_secret():
    """Verifies that requests without the internal service key are rejected with 403."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/research/execute", json={"run_id": "r1"})
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_endpoint_authorized_with_secret():
    """Verifies that requests with the valid internal service key are accepted."""
    settings = get_settings()
    headers = {"X-Internal-Service-Key": settings.INTERNAL_SERVICE_SECRET}
    transport = ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Non-existent run returns 404 from business logic, not 403 forbidden
        res = await client.get("/api/v1/research/non_existent_run/status", headers=headers)
        assert res.status_code == 404
        assert "not found" in res.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_execute_non_existent_run_404():
    """Verifies that execution of non-existent run returns 404."""
    settings = get_settings()
    headers = {"X-Internal-Service-Key": settings.INTERNAL_SERVICE_SECRET}
    transport = ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/research/execute",
            json={"run_id": "non_existent_run_id"},
            headers=headers,
        )
        assert res.status_code == 404


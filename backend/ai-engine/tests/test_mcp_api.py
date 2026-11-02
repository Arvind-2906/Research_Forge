"""Tests for MCP FastAPI Endpoints & Tool Invocation.
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
async def test_mcp_health_endpoint():
    """Verifies that /api/v1/mcp/health reports on all providers."""
    settings = get_settings()
    headers = {"X-Internal-Service-Key": settings.INTERNAL_SERVICE_SECRET}
    transport = ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/mcp/health", headers=headers)
        assert res.status_code == 200
        health_list = res.json()
        assert isinstance(health_list, list)
        provider_names = [h["name"] for h in health_list]
        assert "tavily" in provider_names
        assert "exa" in provider_names
        assert "firecrawl" in provider_names
        assert "github" in provider_names


@pytest.mark.asyncio
async def test_mcp_tools_endpoint():
    """Verifies that /api/v1/mcp/tools returns list of active discovered tools."""
    settings = get_settings()
    headers = {"X-Internal-Service-Key": settings.INTERNAL_SERVICE_SECRET}
    transport = ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/mcp/tools", headers=headers)
        assert res.status_code == 200
        tools = res.json()
        assert len(tools) >= 7
        tool_names = [t["name"] for t in tools]
        assert "tavily_search" in tool_names
        assert "exa_search" in tool_names


@pytest.mark.asyncio
async def test_mcp_invoke_endpoint_unauthorized():
    """Verifies that calling MCP invoke without credentials returns 403."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/mcp/invoke", json={"tool_name": "tavily_search", "run_id": "r1"})
        assert res.status_code == 403


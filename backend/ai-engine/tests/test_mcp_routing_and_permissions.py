"""Tests for MCP Tool Registry, Routing, and Permission Checks.
"""

import sys
import asyncio
import pytest

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from mcp.manager import mcp_manager
from mcp.registry.tool_registry import tool_registry
from mcp.routing.router import mcp_router, RoutingError
from mcp.permissions.permission_checker import permission_checker
from schemas.mcp import MCPToolDefinition


@pytest.mark.asyncio
async def test_tool_registry_and_capability_routing():
    """Verifies that discovered tools can be resolved via high-level research capabilities."""
    await mcp_manager.initialize()

    # Verify tools registered
    tools = tool_registry.list_tools()
    assert len(tools) >= 7

    # Test capability routing
    tool = mcp_router.resolve_tool_for_capability("web_search")
    assert tool is not None
    assert tool.name in ("tavily_search", "exa_search")

    tool_scrape = mcp_router.resolve_tool_for_capability("scrape_url")
    assert tool_scrape is not None
    assert tool_scrape.name == "firecrawl_scrape"

    tool_code = mcp_router.resolve_tool_for_capability("search_repositories")
    assert tool_code is not None
    assert tool_code.name == "github_search_repositories"


def test_schema_validation():
    """Verifies input schema validation and error raising on malformed arguments."""
    tool_def = MCPToolDefinition(
        name="test_search",
        input_schema={
            "type": "object",
            "properties": {"query": {"type": "string"}, "count": {"type": "integer"}},
            "required": ["query"],
        },
        provider="test",
    )

    # Valid input
    mcp_router.validate_tool_input(tool_def, {"query": "AI research", "count": 5})

    # Missing required field
    with pytest.raises(RoutingError):
        mcp_router.validate_tool_input(tool_def, {"count": 5})

    # Wrong type
    with pytest.raises(RoutingError):
        mcp_router.validate_tool_input(tool_def, {"query": 12345})


@pytest.mark.asyncio
async def test_approval_required_evaluation():
    """Verifies that sensitive tools (e.g. crawl) require approval by default."""
    crawl_def = tool_registry.get_tool("firecrawl_crawl")
    if crawl_def:
        decision = await permission_checker.evaluate_permission(
            tool_def=crawl_def,
            run_id="run_test",
        )
        assert decision.is_allowed is False
        assert decision.requires_approval is True


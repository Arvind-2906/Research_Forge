"""Tests for MCP Provider Clients (Tavily, Exa, Firecrawl, GitHub).
"""

import sys
import asyncio
import pytest

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from mcp.clients.tavily_client import TavilyMCPClient
from mcp.clients.exa_client import ExaMCPClient
from mcp.clients.firecrawl_client import FirecrawlMCPClient, validate_public_url
from mcp.clients.github_client import GitHubMCPClient


def test_ssrf_url_validation():
    """Verifies that SSRF validator rejects private, loopback, and malformed URLs."""
    assert validate_public_url("https://example.com/research") is True
    assert validate_public_url("http://arxiv.org/abs/1234") is True

    # Block localhost & private addresses
    assert validate_public_url("http://localhost:8000") is False
    assert validate_public_url("http://127.0.0.1:5000/admin") is False
    assert validate_public_url("http://192.168.1.1/secret") is False
    assert validate_public_url("http://10.0.0.1") is False
    assert validate_public_url("ftp://example.com") is False
    assert validate_public_url("file:///etc/passwd") is False


@pytest.mark.asyncio
async def test_tavily_client_tools_and_invocation():
    """Verifies Tavily tool listing and live web search."""
    client = TavilyMCPClient()
    connected = await client.connect()
    assert connected is True

    tools = await client.list_tools()
    tool_names = [t.name for t in tools]
    assert "tavily_search" in tool_names
    assert "tavily_qna_search" in tool_names

    res = await client.call_tool("tavily_search", {"query": "AI research assistants", "max_results": 2})
    assert res.success is True
    assert len(res.source_urls) > 0
    assert res.duration_ms > 0


@pytest.mark.asyncio
async def test_exa_client_tools_and_invocation():
    """Verifies Exa neural search and tool discovery."""
    client = ExaMCPClient()
    connected = await client.connect()
    assert connected is True

    tools = await client.list_tools()
    tool_names = [t.name for t in tools]
    assert "exa_search" in tool_names
    assert "exa_find_similar" in tool_names

    res = await client.call_tool("exa_search", {"query": "neural search algorithms", "num_results": 2})
    assert res.success is True
    assert len(res.source_urls) > 0


@pytest.mark.asyncio
async def test_firecrawl_client_tools():
    """Verifies Firecrawl scraping tool definition and SSRF rejection."""
    client = FirecrawlMCPClient()
    connected = await client.connect()
    assert connected is True

    tools = await client.list_tools()
    tool_names = [t.name for t in tools]
    assert "firecrawl_scrape" in tool_names
    assert "firecrawl_crawl" in tool_names

    # Test SSRF block on internal host
    res = await client.call_tool("firecrawl_scrape", {"url": "http://127.0.0.1:8000/internal"})
    assert res.success is False
    assert "Only public HTTP/HTTPS URLs are allowed" in res.error


@pytest.mark.asyncio
async def test_github_client_tools_and_search():
    """Verifies GitHub read-only repository search."""
    client = GitHubMCPClient()
    connected = await client.connect()
    assert connected is True

    tools = await client.list_tools()
    tool_names = [t.name for t in tools]
    assert "github_search_repositories" in tool_names
    assert "github_get_repository" in tool_names

    res = await client.call_tool("github_search_repositories", {"query": "langchain", "per_page": 2})
    assert res.success is True
    assert res.data.get("total_count", 0) > 0
    assert len(res.source_urls) > 0


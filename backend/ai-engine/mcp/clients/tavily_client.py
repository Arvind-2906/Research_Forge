"""ResearchForge AI Engine - Tavily MCP Client.

Provides general web search, current context discovery, and Q&A search.
"""

import time
from typing import List, Dict, Any
import httpx

from config.settings import get_settings
from mcp.clients.base_client import BaseMCPClient
from schemas.mcp import MCPToolDefinition, MCPToolResult
from utils.logger import logger


class TavilyMCPClient(BaseMCPClient):
    """MCP client for Tavily Web Search provider."""

    def __init__(self, endpoint: str = "https://api.tavily.com", transport: str = "STREAMABLE_HTTP"):
        super().__init__(name="tavily", endpoint=endpoint, transport=transport)
        self.settings = get_settings()
        self.api_key = self.settings.TAVILY_API_KEY
        self._tools = [
            MCPToolDefinition(
                name="tavily_search",
                description="General web search for comprehensive research topics, news, and current events.",
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "The search query."},
                        "search_depth": {
                            "type": "string",
                            "enum": ["basic", "advanced"],
                            "default": "basic",
                            "description": "Depth of search. Advanced returns higher quality citations.",
                        },
                        "max_results": {"type": "integer", "default": 5, "description": "Maximum search results to return."},
                        "include_answer": {"type": "boolean", "default": True, "description": "Include AI generated quick summary answer."},
                    },
                    "required": ["query"],
                },
                provider="tavily",
                requires_approval=False,
                read_only=True,
            ),
            MCPToolDefinition(
                name="tavily_qna_search",
                description="Optimized Q&A web search returning direct factual answers backed by web citations.",
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Direct question to research."},
                    },
                    "required": ["query"],
                },
                provider="tavily",
                requires_approval=False,
                read_only=True,
            ),
        ]

    async def connect(self) -> bool:
        if not self.api_key:
            self._last_error = "Tavily API key is not configured."
            self._connected = False
            return False
        self._connected = True
        return True

    async def disconnect(self) -> None:
        self._connected = False

    async def list_tools(self) -> List[MCPToolDefinition]:
        return self._tools

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> MCPToolResult:
        if not self.api_key:
            return MCPToolResult(success=False, error="Tavily API key is not configured.")

        start_time = time.perf_counter()
        query = arguments.get("query", "").strip()
        if not query:
            return MCPToolResult(success=False, error="Missing required parameter: query")

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                if tool_name == "tavily_qna_search":
                    url = f"{self.endpoint}/search"
                    payload = {
                        "api_key": self.api_key,
                        "query": query,
                        "search_depth": "advanced",
                        "include_answer": True,
                        "max_results": 3,
                    }
                else:
                    url = f"{self.endpoint}/search"
                    payload = {
                        "api_key": self.api_key,
                        "query": query,
                        "search_depth": arguments.get("search_depth", "basic"),
                        "max_results": min(int(arguments.get("max_results", 5)), 10),
                        "include_answer": arguments.get("include_answer", True),
                    }

                resp = await client.post(url, json=payload)
                duration_ms = (time.perf_counter() - start_time) * 1000.0

                if resp.status_code == 200:
                    data = resp.json()
                    source_urls = [r["url"] for r in data.get("results", []) if "url" in r]
                    logger.info(f"[Tavily MCP] Executed {tool_name} for '{query[:40]}' in {duration_ms:.1f}ms ({len(source_urls)} sources)")
                    return MCPToolResult(
                        success=True,
                        data=data,
                        duration_ms=round(duration_ms, 2),
                        source_urls=source_urls,
                    )
                else:
                    return MCPToolResult(
                        success=False,
                        error=f"Tavily returned HTTP {resp.status_code}: {resp.text[:200]}",
                        duration_ms=round(duration_ms, 2),
                    )
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.error(f"[Tavily MCP Error] {e}")
            return MCPToolResult(success=False, error=str(e), duration_ms=round(duration_ms, 2))


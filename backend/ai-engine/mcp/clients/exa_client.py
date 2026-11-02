"""ResearchForge AI Engine - Exa MCP Client.

Provides neural and semantic search, similarity discovery, and research-oriented web search.
"""

import time
from typing import List, Dict, Any
import httpx

from config.settings import get_settings
from mcp.clients.base_client import BaseMCPClient
from schemas.mcp import MCPToolDefinition, MCPToolResult
from utils.logger import logger


class ExaMCPClient(BaseMCPClient):
    """MCP client for Exa Semantic Search provider."""

    def __init__(self, endpoint: str = "https://api.exa.ai", transport: str = "STREAMABLE_HTTP"):
        super().__init__(name="exa", endpoint=endpoint, transport=transport)
        self.settings = get_settings()
        self.api_key = self.settings.EXA_API_KEY
        self._tools = [
            MCPToolDefinition(
                name="exa_search",
                description="Neural semantic search for academic, scientific, and deep research topics using natural language queries.",
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Natural language research query or statement."},
                        "num_results": {"type": "integer", "default": 5, "description": "Number of results to retrieve."},
                        "use_autoprompt": {"type": "boolean", "default": True, "description": "Auto-optimize query for neural search."},
                    },
                    "required": ["query"],
                },
                provider="exa",
                requires_approval=False,
                read_only=True,
            ),
            MCPToolDefinition(
                name="exa_find_similar",
                description="Discovers web pages and academic sources semantically similar to a given source URL.",
                input_schema={
                    "type": "object",
                    "properties": {
                        "url": {"type": "string", "description": "Target webpage URL to find similar sources for."},
                        "num_results": {"type": "integer", "default": 5, "description": "Number of similar pages to return."},
                    },
                    "required": ["url"],
                },
                provider="exa",
                requires_approval=False,
                read_only=True,
            ),
        ]

    async def connect(self) -> bool:
        if not self.api_key:
            self._last_error = "Exa API key is not configured."
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
            return MCPToolResult(success=False, error="Exa API key is not configured.")

        start_time = time.perf_counter()
        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                if tool_name == "exa_find_similar":
                    url = f"{self.endpoint}/findSimilar"
                    target_url = arguments.get("url", "").strip()
                    if not target_url:
                        return MCPToolResult(success=False, error="Missing required parameter: url")
                    payload = {
                        "url": target_url,
                        "numResults": min(int(arguments.get("num_results", 5)), 10),
                    }
                else:
                    url = f"{self.endpoint}/search"
                    query = arguments.get("query", "").strip()
                    if not query:
                        return MCPToolResult(success=False, error="Missing required parameter: query")
                    payload = {
                        "query": query,
                        "numResults": min(int(arguments.get("num_results", 5)), 10),
                        "useAutoprompt": arguments.get("use_autoprompt", True),
                    }

                resp = await client.post(url, headers=headers, json=payload)
                duration_ms = (time.perf_counter() - start_time) * 1000.0

                if resp.status_code == 200:
                    data = resp.json()
                    source_urls = [r["url"] for r in data.get("results", []) if "url" in r]
                    logger.info(f"[Exa MCP] Executed {tool_name} in {duration_ms:.1f}ms ({len(source_urls)} sources)")
                    return MCPToolResult(
                        success=True,
                        data=data,
                        duration_ms=round(duration_ms, 2),
                        source_urls=source_urls,
                    )
                else:
                    return MCPToolResult(
                        success=False,
                        error=f"Exa returned HTTP {resp.status_code}: {resp.text[:200]}",
                        duration_ms=round(duration_ms, 2),
                    )
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.error(f"[Exa MCP Error] {e}")
            return MCPToolResult(success=False, error=str(e), duration_ms=round(duration_ms, 2))


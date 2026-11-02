"""ResearchForge AI Engine - GitHub MCP Client.

Provides read-only GitHub repository and code research functionality.
"""

import time
from typing import List, Dict, Any
import httpx

from config.settings import get_settings
from mcp.clients.base_client import BaseMCPClient
from schemas.mcp import MCPToolDefinition, MCPToolResult
from utils.logger import logger


class GitHubMCPClient(BaseMCPClient):
    """MCP client for GitHub Research & Code provider."""

    def __init__(self, endpoint: str = "https://api.github.com", transport: str = "STREAMABLE_HTTP"):
        super().__init__(name="github", endpoint=endpoint, transport=transport)
        self.settings = get_settings()
        self._tools = [
            MCPToolDefinition(
                name="github_search_repositories",
                description="Searches GitHub repositories for technical research, open source implementations, and algorithms.",
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search keyword or topic query."},
                        "per_page": {"type": "integer", "default": 5, "description": "Number of repositories to return."},
                    },
                    "required": ["query"],
                },
                provider="github",
                requires_approval=False,
                read_only=True,
            ),
            MCPToolDefinition(
                name="github_get_repository",
                description="Retrieves details and README content for a specific GitHub repository.",
                input_schema={
                    "type": "object",
                    "properties": {
                        "owner": {"type": "string", "description": "Repository owner username or org."},
                        "repo": {"type": "string", "description": "Repository name."},
                    },
                    "required": ["owner", "repo"],
                },
                provider="github",
                requires_approval=False,
                read_only=True,
            ),
        ]

    async def connect(self) -> bool:
        self._connected = True
        return True

    async def disconnect(self) -> None:
        self._connected = False

    async def list_tools(self) -> List[MCPToolDefinition]:
        return self._tools

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> MCPToolResult:
        start_time = time.perf_counter()
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "ResearchForge-AI-Subsystem",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                if tool_name == "github_get_repository":
                    owner = arguments.get("owner", "").strip()
                    repo = arguments.get("repo", "").strip()
                    if not owner or not repo:
                        return MCPToolResult(success=False, error="Missing required parameters: owner and repo")

                    url = f"{self.endpoint}/repos/{owner}/{repo}"
                    resp = await client.get(url, headers=headers)
                    duration_ms = (time.perf_counter() - start_time) * 1000.0

                    if resp.status_code == 200:
                        data = resp.json()
                        source_url = data.get("html_url", f"https://github.com/{owner}/{repo}")
                        logger.info(f"[GitHub MCP] Fetched repo {owner}/{repo} in {duration_ms:.1f}ms")
                        return MCPToolResult(
                            success=True,
                            data={
                                "name": data.get("name"),
                                "full_name": data.get("full_name"),
                                "description": data.get("description"),
                                "stargazers_count": data.get("stargazers_count"),
                                "forks_count": data.get("forks_count"),
                                "language": data.get("language"),
                                "license": data.get("license", {}).get("name") if data.get("license") else None,
                                "html_url": source_url,
                            },
                            duration_ms=round(duration_ms, 2),
                            source_urls=[source_url],
                        )
                    else:
                        return MCPToolResult(
                            success=False,
                            error=f"GitHub API returned HTTP {resp.status_code}: {resp.text[:200]}",
                            duration_ms=round(duration_ms, 2),
                        )
                else:
                    query = arguments.get("query", "").strip()
                    if not query:
                        return MCPToolResult(success=False, error="Missing required parameter: query")

                    per_page = min(int(arguments.get("per_page", 5)), 10)
                    url = f"{self.endpoint}/search/repositories"
                    resp = await client.get(url, headers=headers, params={"q": query, "per_page": per_page})
                    duration_ms = (time.perf_counter() - start_time) * 1000.0

                    if resp.status_code == 200:
                        data = resp.json()
                        items = data.get("items", [])
                        source_urls = [it["html_url"] for it in items if "html_url" in it]
                        formatted = [
                            {
                                "name": it.get("name"),
                                "full_name": it.get("full_name"),
                                "description": it.get("description"),
                                "stargazers_count": it.get("stargazers_count"),
                                "language": it.get("language"),
                                "html_url": it.get("html_url"),
                            }
                            for it in items
                        ]
                        logger.info(f"[GitHub MCP] Executed repo search for '{query[:40]}' in {duration_ms:.1f}ms ({len(source_urls)} repos)")
                        return MCPToolResult(
                            success=True,
                            data={"total_count": data.get("total_count", 0), "items": formatted},
                            duration_ms=round(duration_ms, 2),
                            source_urls=source_urls,
                        )
                    else:
                        return MCPToolResult(
                            success=False,
                            error=f"GitHub API returned HTTP {resp.status_code}: {resp.text[:200]}",
                            duration_ms=round(duration_ms, 2),
                        )
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.error(f"[GitHub MCP Error] {e}")
            return MCPToolResult(success=False, error=str(e), duration_ms=round(duration_ms, 2))


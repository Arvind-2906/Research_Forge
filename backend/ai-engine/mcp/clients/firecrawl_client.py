"""ResearchForge AI Engine - Firecrawl MCP Client.

Provides webpage scraping, crawling, and clean markdown content extraction.
Includes SSRF validation for untrusted URL extraction.
"""

import time
import ipaddress
from urllib.parse import urlparse
from typing import List, Dict, Any
import httpx

from config.settings import get_settings
from mcp.clients.base_client import BaseMCPClient
from schemas.mcp import MCPToolDefinition, MCPToolResult
from utils.logger import logger


def validate_public_url(url: str) -> bool:
    """Validates URL format and blocks loopback/private/internal addresses (SSRF defense)."""
    try:
        parsed = urlparse(url.strip())
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = (parsed.hostname or "").lower()
        if not hostname or hostname in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
            return False
        # Block internal metadata endpoints and private IP ranges
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local:
                return False
        except ValueError:
            pass  # It is a domain name, not a raw IP
        return True
    except Exception:
        return False


class FirecrawlMCPClient(BaseMCPClient):
    """MCP client for Firecrawl Web Scraping & Crawling provider."""

    def __init__(self, endpoint: str = "https://api.firecrawl.dev", transport: str = "STREAMABLE_HTTP"):
        super().__init__(name="firecrawl", endpoint=endpoint, transport=transport)
        self.settings = get_settings()
        self.api_key = self.settings.FIRECRAWL_API_KEY
        self._tools = [
            MCPToolDefinition(
                name="firecrawl_scrape",
                description="Scrapes a target webpage URL and extracts clean, structured Markdown, text, and metadata.",
                input_schema={
                    "type": "object",
                    "properties": {
                        "url": {"type": "string", "description": "The webpage URL to scrape."},
                        "formats": {
                            "type": "array",
                            "items": {"type": "string", "enum": ["markdown", "html"]},
                            "default": ["markdown"],
                            "description": "Requested output formats.",
                        },
                    },
                    "required": ["url"],
                },
                provider="firecrawl",
                requires_approval=False,
                read_only=True,
            ),
            MCPToolDefinition(
                name="firecrawl_crawl",
                description="Initiates an asynchronous crawl job across a website up to a configured page limit.",
                input_schema={
                    "type": "object",
                    "properties": {
                        "url": {"type": "string", "description": "Base website URL to crawl."},
                        "limit": {"type": "integer", "default": 5, "description": "Maximum number of pages to crawl."},
                    },
                    "required": ["url"],
                },
                provider="firecrawl",
                requires_approval=True,  # Crawl operations consume credits and require approval
                read_only=True,
            ),
        ]

    async def connect(self) -> bool:
        if not self.api_key:
            self._last_error = "Firecrawl API key is not configured."
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
            return MCPToolResult(success=False, error="Firecrawl API key is not configured.")

        start_time = time.perf_counter()
        target_url = arguments.get("url", "").strip()

        if not target_url:
            return MCPToolResult(success=False, error="Missing required parameter: url")

        # SSRF Protection
        if not validate_public_url(target_url):
            return MCPToolResult(
                success=False,
                error="Invalid target URL: Only public HTTP/HTTPS URLs are allowed.",
                duration_ms=0.0,
            )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if tool_name == "firecrawl_crawl":
                    url = f"{self.endpoint}/v1/crawl"
                    payload = {
                        "url": target_url,
                        "limit": min(int(arguments.get("limit", 5)), 10),
                    }
                else:
                    url = f"{self.endpoint}/v1/scrape"
                    payload = {
                        "url": target_url,
                        "formats": arguments.get("formats", ["markdown"]),
                    }

                resp = await client.post(url, headers=headers, json=payload)
                duration_ms = (time.perf_counter() - start_time) * 1000.0

                if resp.status_code == 200:
                    data = resp.json()
                    logger.info(f"[Firecrawl MCP] Scraped '{target_url[:50]}' in {duration_ms:.1f}ms")
                    return MCPToolResult(
                        success=True,
                        data=data,
                        duration_ms=round(duration_ms, 2),
                        source_urls=[target_url],
                    )
                else:
                    return MCPToolResult(
                        success=False,
                        error=f"Firecrawl returned HTTP {resp.status_code}: {resp.text[:200]}",
                        duration_ms=round(duration_ms, 2),
                    )
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.error(f"[Firecrawl MCP Error] {e}")
            return MCPToolResult(success=False, error=str(e), duration_ms=round(duration_ms, 2))


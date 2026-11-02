"""ResearchForge AI Engine - Agent-to-MCP Tool Routing.

Routes high-level agent research requests to compatible discovered MCP tools.
"""

from typing import Optional, Dict, Any, List
import jsonschema

from schemas.mcp import MCPToolDefinition
from mcp.registry.tool_registry import tool_registry
from utils.logger import logger


class RoutingError(Exception):
    """Raised when routing or input schema validation fails."""
    pass


class MCPRouter:
    """Matches agent requests to compatible tools and validates input schemas."""

    CAPABILITY_MAP = {
        "web_search": ["tavily_search", "exa_search"],
        "factual_qa": ["tavily_qna_search", "tavily_search"],
        "semantic_search": ["exa_search", "tavily_search"],
        "find_similar": ["exa_find_similar"],
        "scrape_url": ["firecrawl_scrape"],
        "crawl_website": ["firecrawl_crawl"],
        "search_repositories": ["github_search_repositories"],
        "get_repository": ["github_get_repository"],
    }

    def resolve_tool_for_capability(self, capability: str) -> Optional[MCPToolDefinition]:
        """Resolves the best available tool for a specified research capability."""
        candidate_names = self.CAPABILITY_MAP.get(capability.lower(), [capability])
        for name in candidate_names:
            tool = tool_registry.get_tool(name)
            if tool:
                return tool
        return None

    def validate_tool_input(self, tool_def: MCPToolDefinition, arguments: Dict[str, Any]) -> None:
        """Validates arguments against the tool's discovered JSON schema."""
        if not tool_def.input_schema:
            return

        try:
            jsonschema.validate(instance=arguments, schema=tool_def.input_schema)
        except jsonschema.ValidationError as e:
            logger.warning(f"[MCPRouter] Input schema validation failed for {tool_def.name}: {e.message}")
            raise RoutingError(f"Invalid arguments for tool '{tool_def.name}': {e.message}") from e


# Global MCP router instance
mcp_router = MCPRouter()


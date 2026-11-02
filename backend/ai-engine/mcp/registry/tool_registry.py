"""ResearchForge AI Engine - Central MCP Tool Registry.

Maintains registry of all discovered MCP tools mapped to their provider clients.
"""

from typing import Dict, List, Optional
from langchain_core.tools import StructuredTool

from schemas.mcp import MCPToolDefinition
from mcp.clients.base_client import BaseMCPClient
from mcp.discovery.tool_discovery import tool_discovery
from utils.logger import logger


class ToolRegistry:
    """Registry maintaining active MCP tool definitions and their provider bindings."""

    def __init__(self):
        self._tools: Dict[str, MCPToolDefinition] = {}
        self._tool_to_client: Dict[str, BaseMCPClient] = {}

    def register_client_tools(self, client: BaseMCPClient, tools: List[MCPToolDefinition]):
        """Registers a list of tools belonging to a client."""
        for t in tools:
            self._tools[t.name] = t
            self._tool_to_client[t.name] = client
            logger.debug(f"[ToolRegistry] Registered tool '{t.name}' (provider: {t.provider})")

    def get_tool(self, tool_name: str) -> Optional[MCPToolDefinition]:
        """Retrieves an MCPToolDefinition by name."""
        return self._tools.get(tool_name)

    def get_client_for_tool(self, tool_name: str) -> Optional[BaseMCPClient]:
        """Retrieves the client responsible for executing the named tool."""
        return self._tool_to_client.get(tool_name)

    def list_tools(self) -> List[MCPToolDefinition]:
        """Returns all registered tool definitions."""
        return list(self._tools.values())

    def get_tools_by_provider(self, provider_name: str) -> List[MCPToolDefinition]:
        """Returns all tools belonging to a specific provider."""
        return [t for t in self._tools.values() if t.provider == provider_name]

    def build_langchain_tools(self, invoker) -> List[StructuredTool]:
        """Converts all registered tools into LangChain StructuredTool instances."""
        lc_tools = []
        for t in self._tools.values():
            lc_tools.append(tool_discovery.create_langchain_tool(t, invoker))
        return lc_tools


# Global tool registry instance
tool_registry = ToolRegistry()


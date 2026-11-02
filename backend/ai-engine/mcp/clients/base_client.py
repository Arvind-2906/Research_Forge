"""ResearchForge AI Engine - Base MCP Client Interface.

Abstract base class for all remote MCP provider clients.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from schemas.mcp import MCPToolDefinition, MCPToolResult, MCPServerHealth


class BaseMCPClient(ABC):
    """Abstract base class for remote MCP server clients."""

    def __init__(self, name: str, endpoint: str = "", transport: str = "STREAMABLE_HTTP"):
        self.name = name
        self.endpoint = endpoint
        self.transport = transport
        self._connected = False
        self._last_error: Optional[str] = None

    @property
    def is_connected(self) -> bool:
        return self._connected

    @abstractmethod
    async def connect(self) -> bool:
        """Establishes connection to the remote MCP server or provider."""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Terminates session cleanly."""
        pass

    @abstractmethod
    async def list_tools(self) -> List[MCPToolDefinition]:
        """Dynamically discovers tools available from this MCP server."""
        pass

    @abstractmethod
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> MCPToolResult:
        """Executes a dynamically discovered tool with arguments."""
        pass

    async def check_health(self) -> MCPServerHealth:
        """Probes provider health and returns status."""
        try:
            connected = await self.connect() if not self.is_connected else True
            tools = await self.list_tools() if connected else []
            return MCPServerHealth(
                name=self.name,
                status="CONNECTED" if connected else "ERROR",
                endpoint=self.endpoint,
                transport=self.transport,
                tool_count=len(tools),
                error=self._last_error if not connected else None,
            )
        except Exception as e:
            return MCPServerHealth(
                name=self.name,
                status="ERROR",
                endpoint=self.endpoint,
                transport=self.transport,
                tool_count=0,
                error=str(e),
            )


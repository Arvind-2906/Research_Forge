"""ResearchForge MCP Manager.

Manages connections to remote Model Context Protocol (MCP) servers using the official Python MCP SDK.
No custom MCP servers are hosted; this service acts exclusively as an MCP client.
"""


class MCPClientManager:
    """Manages discovery, connection, and lifecycle of remote MCP client sessions."""

    def __init__(self):
        self.active_sessions = {}

    async def connect_remote_server(self, server_name: str, endpoint: str):
        """Connects to an existing remote MCP server."""
        raise NotImplementedError("MCP client connection will be configured during tool integration.")

    async def disconnect_all(self):
        """Closes all active remote MCP client sessions."""
        pass


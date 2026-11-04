"""ResearchForge AI Engine - Central MCP Orchestration Manager.

Coordinates MCP provider connections, tool discovery, permission enforcement,
tool execution logging, and health monitoring.
"""

import time
from typing import Dict, List, Optional, Any

from schemas.mcp import (
    MCPToolDefinition,
    MCPToolResult,
    MCPServerHealth,
    MCPCallRequest,
    MCPCallResponse,
    
)
from mcp.clients.base_client import BaseMCPClient
from mcp.clients.tavily_client import TavilyMCPClient
from mcp.clients.exa_client import ExaMCPClient
from mcp.clients.firecrawl_client import FirecrawlMCPClient
from mcp.clients.github_client import GitHubMCPClient
from mcp.registry.tool_registry import tool_registry
from mcp.routing.router import mcp_router, RoutingError
from mcp.permissions.permission_checker import permission_checker
from mcp.discovery.tool_discovery import tool_discovery
from database.repositories import mcp_repository, event_repository
from utils.logger import logger


class MCPManager:
    """Central orchestrator for all MCP provider connections and tool executions."""

    def __init__(self):
        self._clients: Dict[str, BaseMCPClient] = {}
        self._initialized = False

    def register_client(self, client: BaseMCPClient) -> None:
        """Registers an MCP provider client."""
        self._clients[client.name] = client
        logger.info(f"[MCPManager] Registered provider client: {client.name}")

    async def initialize(self) -> None:
        """Initializes default providers and discovers their available tools."""
        if self._initialized:
            return

        logger.info("[MCPManager] Initializing MCP clients...")

        # Register standard research providers
        self.register_client(TavilyMCPClient())
        self.register_client(ExaMCPClient())
        self.register_client(FirecrawlMCPClient())
        self.register_client(GitHubMCPClient())

        # Connect and discover tools for each registered provider
        for client in self._clients.values():
            try:
                connected = await client.connect()
                if connected:
                    tools = await tool_discovery.discover_and_persist(client)
                    tool_registry.register_client_tools(client, tools)
                else:
                    logger.warning(f"[MCPManager] Provider '{client.name}' connection deferred: credentials not set")
            except Exception as e:
                logger.error(f"[MCPManager] Error initializing provider '{client.name}': {e}")

        self._initialized = True
        logger.info(f"[MCPManager] Initialization complete. {len(tool_registry.list_tools())} tools active in registry.")

    async def get_all_health(self) -> List[MCPServerHealth]:
        """Probes the health status of all registered MCP providers."""
        if not self._initialized:
            await self.initialize()

        health_reports: List[MCPServerHealth] = []
        for client in self._clients.values():
            health = await client.check_health()
            health_reports.append(health)
        return health_reports

    def get_client(self, provider_name: str) -> Optional[BaseMCPClient]:
        """Retrieves a client by provider name."""
        return self._clients.get(provider_name.lower())

    async def invoke_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        run_id: str,
        user_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
        workspace_role: Optional[str] = None,
    ) -> MCPCallResponse:
        """Executes a tool with schema validation, permission checks, audit logging, and approvals."""
        if not self._initialized:
            await self.initialize()

        # 1. Look up tool definition
        tool_def = tool_registry.get_tool(tool_name)
        if not tool_def:
            # Attempt to resolve via capability
            tool_def = mcp_router.resolve_tool_for_capability(tool_name)
            if tool_def:
                tool_name = tool_def.name
            else:
                return MCPCallResponse(
                    call_id="",
                    status="FAILED",
                    error=f"Tool or capability '{tool_name}' not found in registry.",
                )

        client = tool_registry.get_client_for_tool(tool_name)
        if not client or not client.is_connected:
            return MCPCallResponse(
                call_id="",
                status="FAILED",
                error=f"Provider '{tool_def.provider}' is disconnected or unavailable.",
            )

        # 2. Validate input schema
        try:
            mcp_router.validate_tool_input(tool_def, arguments)
        except RoutingError as e:
            return MCPCallResponse(call_id="", status="FAILED", error=str(e))

        # 3. Check permissions and approval requirements
        decision = await permission_checker.evaluate_permission(
            tool_def=tool_def,
            run_id=run_id,
            user_id=user_id,
            workspace_role=workspace_role,
        )

        if not decision.is_allowed:
            if decision.requires_approval:
                # Log PENDING tool call and create approval request
                tool_call = await mcp_repository.create_tool_call(
                    run_id=run_id,
                    tool_name=tool_name,
                    arguments=arguments,
                    approval_required=True,
                )
                approval = await mcp_repository.create_approval_request(
                    tool_call_id=tool_call["id"],
                    requested_by_agent="ResearcherAgent",
                    request_reason=decision.reason,
                    requested_by_id=user_id,
                )
                await event_repository.create_event(
                    run_id=run_id,
                    event_type="APPROVAL_REQUESTED",
                    message=f"Human approval required to execute tool '{tool_name}'",
                    payload={"approval_id": approval["id"], "tool_name": tool_name},
                )
                return MCPCallResponse(
                    call_id=tool_call["id"],
                    status="PENDING_APPROVAL",
                    requires_approval=True,
                    approval_id=approval["id"],
                    error=decision.reason,
                )
            else:
                return MCPCallResponse(
                    call_id="",
                    status="FORBIDDEN",
                    error=decision.reason or "Tool call is not permitted by policy.",
                )

        # 4. Create tool call audit log
        tool_call = await mcp_repository.create_tool_call(
            run_id=run_id,
            tool_name=tool_name,
            arguments=arguments,
            approval_required=False,
        )
        call_id = tool_call["id"]

        # 5. Emit mcp.tool_started event
        await event_repository.create_event(
            run_id=run_id,
            event_type="mcp.tool_started",
            message=f"Starting tool '{tool_name}' execution via provider '{tool_def.provider}'",
            agent_name="MCPManager",
            payload={"tool_name": tool_name, "provider": tool_def.provider, "call_id": call_id},
        )

        # 6. Execute tool via client
        start_time = time.perf_counter()
        result = await client.call_tool(tool_name, arguments)
        duration_ms = int((time.perf_counter() - start_time) * 1000)

        # 7. Update tool call record
        status_str = "SUCCESS" if result.success else "FAILED"
        result_payload = {"data": result.data, "sources": result.source_urls} if result.success else None
        await mcp_repository.complete_tool_call(
            call_id=call_id,
            status=status_str,
            result=result_payload,
            error_message=result.error,
            duration_ms=duration_ms,
        )

        # 8. Emit mcp.tool_completed or mcp.tool_failed research event
        event_type = "mcp.tool_completed" if result.success else "mcp.tool_failed"
        await event_repository.create_event(
            run_id=run_id,
            event_type=event_type,
            message=f"Tool '{tool_name}' finished ({status_str}) in {duration_ms}ms",
            agent_name="MCPManager",
            severity="INFO" if result.success else "WARN",
            payload={"tool_name": tool_name, "status": status_str, "duration_ms": duration_ms, "sources_count": len(result.source_urls)},
        )

        return MCPCallResponse(
            call_id=call_id,
            status=status_str,
            result=result_payload,
            error=result.error,
            duration_ms=duration_ms,
        )

    def get_langchain_tools(self, run_id: str = "system") -> List[Any]:
        """Provides LangChain StructuredTools bound to this manager."""
        async def invoker(name: str, args: dict):
            resp = await self.invoke_tool(name, args, run_id=run_id)
            if resp.status_code == "SUCCESS" if hasattr(resp, "status_code") else resp.status == "SUCCESS":
                return resp.result
            raise RuntimeError(resp.error or "Tool execution failed")

        return tool_registry.build_langchain_tools(invoker)


# Global MCP manager instance
mcp_manager = MCPManager()

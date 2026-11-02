"""ResearchForge AI Engine - Dynamic MCP Tool Discovery.

Discovers tools from MCP providers, validates schemas, persists metadata into Neon PostgreSQL,
and adapts them to LangChain StructuredTool instances for LangGraph agents.
"""

import hashlib
import json
from typing import List, Dict, Any, Optional, Callable
from langchain_core.tools import StructuredTool

from schemas.mcp import MCPToolDefinition, MCPToolResult
from mcp.clients.base_client import BaseMCPClient
from database.repositories import mcp_repository
from utils.logger import logger


class ToolDiscoveryService:
    """Handles dynamic tool inspection, schema hashing, and persistence."""

    @staticmethod
    def compute_schema_hash(schema: Dict[str, Any]) -> str:
        """Computes deterministic SHA256 hash of a tool input schema."""
        serialized = json.dumps(schema or {}, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    async def discover_and_persist(
        self,
        client: BaseMCPClient,
        workspace_id: Optional[str] = None,
        created_by_id: Optional[str] = None,
    ) -> List[MCPToolDefinition]:
        """Discovers tools from a connected client and optionally persists to DB."""
        tools = await client.list_tools()
        logger.info(f"[Tool Discovery] Discovered {len(tools)} tools from provider '{client.name}'")

        if workspace_id and created_by_id:
            try:
                server_record = await mcp_repository.upsert_server(
                    workspace_id=workspace_id,
                    name=client.name,
                    endpoint=client.endpoint,
                    created_by_id=created_by_id,
                    transport=client.transport,
                    description=f"{client.name.capitalize()} MCP Provider",
                )
                server_id = server_record["id"]

                for t in tools:
                    schema_hash = self.compute_schema_hash(t.input_schema)
                    await mcp_repository.upsert_tool(
                        server_id=server_id,
                        name=t.name,
                        description=t.description,
                        input_schema=t.input_schema,
                        output_schema=t.output_schema,
                        schema_hash=schema_hash,
                    )
                logger.info(f"[Tool Discovery] Persisted tools for server '{client.name}' in workspace '{workspace_id}'")
            except Exception as e:
                logger.warning(f"[Tool Discovery Persistence Warning] {e}")

        return tools

    def create_langchain_tool(
        self,
        tool_def: MCPToolDefinition,
        invoker: Callable[..., Any],
    ) -> StructuredTool:
        """Adapts an MCPToolDefinition into a LangChain StructuredTool."""

        async def _async_runner(**kwargs) -> str:
            res: MCPToolResult = await invoker(tool_def.name, kwargs)
            if not res.success:
                return f"Error executing tool {tool_def.name}: {res.error}"
            if isinstance(res.data, (dict, list)):
                return json.dumps(res.data, indent=2)
            return str(res.data)

        return StructuredTool.from_function(
            name=tool_def.name,
            description=tool_def.description,
            coroutine=_async_runner,
        )


# Global tool discovery instance
tool_discovery = ToolDiscoveryService()


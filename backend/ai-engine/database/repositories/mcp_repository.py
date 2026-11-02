"""ResearchForge AI Engine - MCP Database Repository.

Provides direct async data access for MCPServer, MCPTool, MCPToolCall,
MCPToolPermission, and MCPApprovalRequest entities.
"""

import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from psycopg.rows import dict_row

from database.connection import db
from utils.id_generator import generate_cuid
from utils.logger import logger


class MCPRepository:
    """Provides database operations for the MCP client and orchestration subsystem."""

    async def upsert_server(
        self,
        workspace_id: str,
        name: str,
        endpoint: str,
        created_by_id: str,
        transport: str = "STREAMABLE_HTTP",
        auth_type: str = "API_KEY",
        description: Optional[str] = None,
        configuration: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Registers or updates an MCPServer record."""
        server_id = generate_cuid("mcp_")
        now = datetime.now(timezone.utc)
        config_json = json.dumps(configuration) if configuration is not None else None

        query = """
            INSERT INTO "MCPServer" (
                id, name, description, endpoint, transport, "authType", status,
                "isEnabled", configuration, "workspaceId", "createdById", "createdAt", "updatedAt"
            )
            VALUES (
                %s, %s, %s, %s, %s::"MCPTransport", %s::"MCPAuthType", 'CONNECTED'::"MCPConnectionStatus",
                true, %s::jsonb, %s, %s, %s, %s
            )
            ON CONFLICT ("workspaceId", name) DO UPDATE
            SET endpoint = EXCLUDED.endpoint,
                description = COALESCE(EXCLUDED.description, "MCPServer".description),
                transport = EXCLUDED.transport,
                "authType" = EXCLUDED."authType",
                status = 'CONNECTED'::"MCPConnectionStatus",
                "lastConnectedAt" = %s,
                "lastHealthCheckAt" = %s,
                "updatedAt" = %s
            RETURNING id, name, description, endpoint, transport, "authType", status,
                      "isEnabled", configuration, "workspaceId", "createdAt", "updatedAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (
                        server_id,
                        name,
                        description,
                        endpoint,
                        transport,
                        auth_type,
                        config_json,
                        workspace_id,
                        created_by_id,
                        now,
                        now,
                        now,
                        now,
                        now,
                    ),
                )
                return await cur.fetchone()

    async def update_server_status(
        self,
        server_id: str,
        status: str,
        last_error: Optional[str] = None,
        capabilities: Optional[Dict[str, Any]] = None,
        protocol_version: Optional[str] = None,
    ) -> bool:
        """Updates connection status and health probe timestamp for an MCPServer."""
        now = datetime.now(timezone.utc)
        updates = ['status = %s::"MCPConnectionStatus"', '"lastHealthCheckAt" = %s', '"updatedAt" = %s']
        params = [status, now, now]

        if status == "CONNECTED":
            updates.append('"lastConnectedAt" = %s')
            params.append(now)

        if last_error is not None:
            updates.append('"lastError" = %s')
            params.append(last_error)

        if capabilities is not None:
            updates.append('capabilities = %s::jsonb')
            params.append(json.dumps(capabilities))

        if protocol_version is not None:
            updates.append('"protocolVersion" = %s')
            params.append(protocol_version)

        params.append(server_id)
        query = f'UPDATE "MCPServer" SET {", ".join(updates)} WHERE id = %s'

        async with db.get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, params)
                return cur.rowcount > 0

    async def get_servers(self, workspace_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists registered MCP servers."""
        if workspace_id:
            query = """
                SELECT id, name, description, endpoint, transport, "authType", status,
                       "isEnabled", capabilities, "protocolVersion", "lastConnectedAt",
                       "lastHealthCheckAt", "lastError", "workspaceId", "createdAt", "updatedAt"
                FROM "MCPServer"
                WHERE "workspaceId" = %s
                ORDER BY name ASC
            """
            params = (workspace_id,)
        else:
            query = """
                SELECT id, name, description, endpoint, transport, "authType", status,
                       "isEnabled", capabilities, "protocolVersion", "lastConnectedAt",
                       "lastHealthCheckAt", "lastError", "workspaceId", "createdAt", "updatedAt"
                FROM "MCPServer"
                ORDER BY name ASC
            """
            params = ()

        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, params)
                return await cur.fetchall()

    async def upsert_tool(
        self,
        server_id: str,
        name: str,
        description: Optional[str] = None,
        input_schema: Optional[Dict[str, Any]] = None,
        output_schema: Optional[Dict[str, Any]] = None,
        schema_hash: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Saves a dynamically discovered tool from an MCP server."""
        tool_id = generate_cuid("tl_")
        now = datetime.now(timezone.utc)
        in_schema_json = json.dumps(input_schema) if input_schema is not None else None
        out_schema_json = json.dumps(output_schema) if output_schema is not None else None

        query = """
            INSERT INTO "MCPTool" (
                id, name, description, "inputSchema", "outputSchema", "schemaHash",
                "isEnabled", "discoveredAt", "lastSeenAt", "serverId"
            )
            VALUES (%s, %s, %s, %s::jsonb, %s::jsonb, %s, true, %s, %s, %s)
            ON CONFLICT ("serverId", name) DO UPDATE
            SET description = COALESCE(EXCLUDED.description, "MCPTool".description),
                "inputSchema" = EXCLUDED."inputSchema",
                "outputSchema" = EXCLUDED."outputSchema",
                "schemaHash" = EXCLUDED."schemaHash",
                "lastSeenAt" = %s
            RETURNING id, name, description, "inputSchema", "outputSchema", "schemaHash",
                      "isEnabled", "discoveredAt", "lastSeenAt", "serverId"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (
                        tool_id,
                        name,
                        description,
                        in_schema_json,
                        out_schema_json,
                        schema_hash,
                        now,
                        now,
                        server_id,
                        now,
                    ),
                )
                return await cur.fetchone()

    async def get_tools_for_server(self, server_id: str) -> List[Dict[str, Any]]:
        """Lists all discovered tools for a given MCP server."""
        query = """
            SELECT id, name, description, "inputSchema", "outputSchema", "schemaHash",
                   "isEnabled", "discoveredAt", "lastSeenAt", "serverId"
            FROM "MCPTool"
            WHERE "serverId" = %s AND "isEnabled" = true
            ORDER BY name ASC
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (server_id,))
                return await cur.fetchall()

    async def get_all_active_tools(self) -> List[Dict[str, Any]]:
        """Lists all enabled tools across all enabled MCP servers."""
        query = """
            SELECT t.id, t.name, t.description, t."inputSchema", t."outputSchema",
                   t."serverId", s.name AS "serverName", s.endpoint AS "serverEndpoint",
                   s.transport AS "serverTransport"
            FROM "MCPTool" t
            JOIN "MCPServer" s ON t."serverId" = s.id
            WHERE t."isEnabled" = true AND s."isEnabled" = true
            ORDER BY s.name ASC, t.name ASC
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query)
                return await cur.fetchall()

    async def create_tool_call(
        self,
        run_id: str,
        tool_name: str,
        arguments: Optional[Dict[str, Any]] = None,
        server_id: Optional[str] = None,
        tool_id: Optional[str] = None,
        approval_required: bool = False,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates an audit log record for an MCP tool invocation."""
        call_id = generate_cuid("cll_")
        now = datetime.now(timezone.utc)
        args_json = json.dumps(arguments) if arguments is not None else None

        query = """
            INSERT INTO "MCPToolCall" (
                id, "toolName", status, arguments, "approvalRequired",
                "idempotencyKey", "startedAt", "createdAt", "runId", "serverId", "toolId"
            )
            VALUES (%s, %s, 'RUNNING'::"MCPToolCallStatus", %s::jsonb, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, "toolName", status, arguments, "approvalRequired", "startedAt", "createdAt", "runId"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (
                        call_id,
                        tool_name,
                        args_json,
                        approval_required,
                        idempotency_key,
                        now,
                        now,
                        run_id,
                        server_id,
                        tool_id,
                    ),
                )
                return await cur.fetchone()

    async def complete_tool_call(
        self,
        call_id: str,
        status: str,
        result: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        duration_ms: Optional[int] = None,
    ) -> bool:
        """Completes an MCP tool call record with result or error."""
        now = datetime.now(timezone.utc)
        result_json = json.dumps(result) if result is not None else None

        query = """
            UPDATE "MCPToolCall"
            SET status = %s::"MCPToolCallStatus",
                result = %s::jsonb,
                "errorMessage" = %s,
                "durationMs" = %s,
                "completedAt" = %s
            WHERE id = %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (status, result_json, error_message, duration_ms, now, call_id))
                return cur.rowcount > 0

    async def check_tool_permission(
        self,
        server_id: str,
        tool_id: str,
        user_id: Optional[str] = None,
        workspace_role: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Checks if a tool is permitted and whether it requires human approval."""
        query = """
            SELECT "isAllowed", "requiresApproval"
            FROM "MCPToolPermission"
            WHERE "serverId" = %s AND "toolId" = %s
              AND ("userId" = %s OR "workspaceRole" = %s::"WorkspaceRole" OR ("userId" IS NULL AND "workspaceRole" IS NULL))
            ORDER BY "userId" NULLS LAST, "workspaceRole" NULLS LAST
            LIMIT 1
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (server_id, tool_id, user_id, workspace_role))
                res = await cur.fetchone()
                if res:
                    return res
                # Default permission policy if not explicitly restricted: allowed, no approval needed
                return {"isAllowed": True, "requiresApproval": False}

    async def create_approval_request(
        self,
        tool_call_id: str,
        requested_by_agent: str,
        request_reason: Optional[str] = None,
        requested_by_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates an approval request for a sensitive MCP action."""
        appr_id = generate_cuid("apr_")
        now = datetime.now(timezone.utc)

        query = """
            INSERT INTO "MCPApprovalRequest" (
                id, status, "requestedByAgent", "requestReason", "requestedAt", "toolCallId", "requestedById"
            )
            VALUES (%s, 'PENDING'::"ApprovalStatus", %s, %s, %s, %s, %s)
            RETURNING id, status, "requestedByAgent", "requestReason", "requestedAt", "toolCallId"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (appr_id, requested_by_agent, request_reason, now, tool_call_id, requested_by_id),
                )
                return await cur.fetchone()

    async def review_approval_request(
        self,
        approval_id: str,
        status: str,
        reviewed_by_id: str,
        review_comment: Optional[str] = None,
    ) -> bool:
        """Approves or rejects a pending tool approval request."""
        now = datetime.now(timezone.utc)
        query = """
            UPDATE "MCPApprovalRequest"
            SET status = %s::"ApprovalStatus",
                "reviewedById" = %s,
                "reviewComment" = %s,
                "reviewedAt" = %s
            WHERE id = %s AND status = 'PENDING'::"ApprovalStatus"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (status, reviewed_by_id, review_comment, now, approval_id))
                return cur.rowcount > 0


# Global MCP repository instance
mcp_repository = MCPRepository()


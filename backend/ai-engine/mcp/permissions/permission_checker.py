"""ResearchForge AI Engine - MCP Tool Permissions & Approvals.

Enforces workspace, user, and tool-level permissions, and manages human approval gates.
"""

from typing import Optional, Dict, Any
from schemas.mcp import MCPToolDefinition
from database.repositories import mcp_repository
from utils.logger import logger


class PermissionDecision:
    def __init__(
        self,
        is_allowed: bool,
        requires_approval: bool = False,
        reason: Optional[str] = None,
        approval_id: Optional[str] = None,
    ):
        self.is_allowed = is_allowed
        self.requires_approval = requires_approval
        self.reason = reason
        self.approval_id = approval_id


class PermissionChecker:
    """Evaluates whether an agent execution has authorization to call an MCP tool."""

    async def evaluate_permission(
        self,
        tool_def: MCPToolDefinition,
        run_id: str,
        user_id: Optional[str] = None,
        workspace_role: Optional[str] = None,
        server_id: Optional[str] = None,
        tool_id: Optional[str] = None,
    ) -> PermissionDecision:
        """Determines if the tool call is permitted and if human approval is mandatory."""

        # 1. Check database-persisted permissions if tool is registered with server_id
        if server_id and tool_id:
            perm = await mcp_repository.check_tool_permission(
                server_id=server_id,
                tool_id=tool_id,
                user_id=user_id,
                workspace_role=workspace_role,
            )
            if not perm.get("isAllowed", True):
                return PermissionDecision(
                    is_allowed=False,
                    reason=f"Access to tool '{tool_def.name}' is forbidden for this user/workspace role.",
                )
            if perm.get("requiresApproval", False):
                return PermissionDecision(
                    is_allowed=False,
                    requires_approval=True,
                    reason=f"Tool '{tool_def.name}' requires explicit human approval before execution.",
                )

        # 2. Check definition-level approval requirement (e.g., intensive crawling)
        if tool_def.requires_approval:
            return PermissionDecision(
                is_allowed=False,
                requires_approval=True,
                reason=f"Action '{tool_def.name}' is flagged as sensitive and requires human confirmation.",
            )

        return PermissionDecision(is_allowed=True)


# Global permission checker instance
permission_checker = PermissionChecker()


"""ResearchForge AI Engine - MCP Management & Invocation API Routes.

Endpoints for checking MCP server health, listing discovered tools, executing tools,
and reviewing human approval requests. Protected by internal service authentication.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from api.dependencies.auth import verify_internal_service_key
from schemas.mcp import MCPServerHealth, MCPToolDefinition, MCPCallRequest, MCPCallResponse
from mcp.manager import mcp_manager
from mcp.registry.tool_registry import tool_registry
from database.repositories import mcp_repository

router = APIRouter(
    prefix="/api/v1/mcp",
    tags=["MCP Subsystem"],
    dependencies=[Depends(verify_internal_service_key)],
)


class ApprovalReviewRequest(BaseModel):
    status: str  # APPROVED or REJECTED
    reviewed_by_id: str
    comment: Optional[str] = None


@router.get("/health", response_model=List[MCPServerHealth])
async def check_mcp_health():
    """Probes all configured MCP providers and returns health and tool counts."""
    return await mcp_manager.get_all_health()


@router.get("/tools", response_model=List[MCPToolDefinition])
async def list_mcp_tools():
    """Lists all dynamically discovered tools active in the tool registry."""
    if not mcp_manager._initialized:
        await mcp_manager.initialize()
    return tool_registry.list_tools()


@router.get("/servers")
async def list_mcp_servers():
    """Lists all MCP servers registered in the database."""
    return await mcp_repository.get_servers()


@router.post("/invoke", response_model=MCPCallResponse)
async def invoke_mcp_tool(request: MCPCallRequest):
    """Dynamically executes an MCP tool with schema validation and permission enforcement."""
    response = await mcp_manager.invoke_tool(
        tool_name=request.tool_name,
        arguments=request.arguments,
        run_id=request.run_id,
        user_id=request.user_id,
        workspace_id=request.workspace_id,
    )
    return response


@router.post("/approvals/{approval_id}/review")
async def review_mcp_approval(approval_id: str, request: ApprovalReviewRequest):
    """Approves or rejects a pending human-in-the-loop MCP tool approval request."""
    status_upper = request.status.upper()
    if status_upper not in ("APPROVED", "REJECTED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be either APPROVED or REJECTED.",
        )

    updated = await mcp_repository.review_approval_request(
        approval_id=approval_id,
        status=status_upper,
        reviewed_by_id=request.reviewed_by_id,
        review_comment=request.comment,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval request {approval_id} not found or already reviewed.",
        )

    return {"success": True, "approval_id": approval_id, "status": status_upper}


"""ResearchForge AI Engine - MCP Protocol Schemas.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class MCPToolDefinition(BaseModel):
    name: str
    description: str = ""
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    output_schema: Optional[Dict[str, Any]] = None
    provider: str
    requires_approval: bool = False
    read_only: bool = True


class MCPToolResult(BaseModel):
    success: bool
    data: Any = None
    error: Optional[str] = None
    duration_ms: float = 0.0
    source_urls: List[str] = Field(default_factory=list)


class MCPCallRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    run_id: str
    user_id: Optional[str] = None
    workspace_id: Optional[str] = None


class MCPCallResponse(BaseModel):
    call_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    requires_approval: bool = False
    approval_id: Optional[str] = None
    duration_ms: Optional[int] = None


class MCPServerHealth(BaseModel):
    name: str
    status: str
    endpoint: Optional[str] = None
    transport: str = "STREAMABLE_HTTP"
    tool_count: int = 0
    error: Optional[str] = None


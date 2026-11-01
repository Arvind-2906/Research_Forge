"""ResearchForge AI Engine - Execution & Orchestration Schemas.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ExecuteRunRequest(BaseModel):
    run_id: str
    user_id: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class PlanApprovalRequest(BaseModel):
    plan_id: str
    approved_by: str


class PlanRejectionRequest(BaseModel):
    plan_id: str
    reason: Optional[str] = None


class RunExecutionResponse(BaseModel):
    success: bool
    run_id: str
    message: str
    status: Optional[str] = None
    graph_thread_id: Optional[str] = None


class RunStatusResponse(BaseModel):
    run_id: str
    status: str
    graph_thread_id: Optional[str] = None
    checkpoint_found: bool = False
    total_tokens: int = 0
    question: Optional[str] = None
    error_message: Optional[str] = None


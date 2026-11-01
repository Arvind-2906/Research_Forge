"""ResearchForge AI Engine - Research Lifecycle API Routes.

Internal endpoints for research execution, pause, resume, cancel, plan approval,
and checkpoint status inspection. Protected by X-Internal-Service-Key.
"""

from fastapi import APIRouter, Depends
from api.dependencies.auth import verify_internal_service_key
from schemas.execution import (
    ExecuteRunRequest,
    RunExecutionResponse,
    RunStatusResponse,
    PlanApprovalRequest,
    PlanRejectionRequest,
)
from services.execution_service import execution_service

router = APIRouter(
    prefix="/api/v1/research",
    tags=["Research Orchestration"],
    dependencies=[Depends(verify_internal_service_key)],
)


@router.post("/execute", response_model=RunExecutionResponse)
async def execute_research(request: ExecuteRunRequest):
    """Executes a research run."""
    return await execution_service.execute_run(request)


@router.post("/{run_id}/pause", response_model=RunExecutionResponse)
async def pause_research(run_id: str):
    """Pauses an in-flight research run."""
    return await execution_service.pause_run(run_id)


@router.post("/{run_id}/resume", response_model=RunExecutionResponse)
async def resume_research(run_id: str):
    """Resumes a paused research run from checkpoint."""
    return await execution_service.resume_run(run_id)


@router.post("/{run_id}/cancel", response_model=RunExecutionResponse)
async def cancel_research(run_id: str):
    """Cancels a research run."""
    return await execution_service.cancel_run(run_id)


@router.post("/{run_id}/retry", response_model=RunExecutionResponse)
async def retry_research(run_id: str):
    """Retries a research run."""
    return await execution_service.retry_run(run_id)


@router.post("/{run_id}/approve-plan", response_model=RunExecutionResponse)
async def approve_research_plan(run_id: str, request: PlanApprovalRequest):
    """Approves research plan and signals agent to proceed."""
    return await execution_service.approve_plan(run_id, request)


@router.post("/{run_id}/reject-plan", response_model=RunExecutionResponse)
async def reject_research_plan(run_id: str, request: PlanRejectionRequest):
    """Rejects research plan and logs feedback for replanning."""
    return await execution_service.reject_plan(run_id, request)


@router.get("/{run_id}/status", response_model=RunStatusResponse)
async def get_research_status(run_id: str):
    """Retrieves current run status and graph checkpoint state."""
    return await execution_service.get_status(run_id)


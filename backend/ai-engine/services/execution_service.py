"""ResearchForge AI Engine - Research Run Execution Service.

Coordinates graph execution, thread state checkpoints, pause/resume/cancel lifecycles,
and event emissions.
"""

import asyncio
from typing import Optional, Dict, Any
from fastapi import HTTPException

from config.settings import get_settings
from database.repositories import run_repository, event_repository
from graph.checkpointer import checkpoint_manager
from schemas.execution import (
    ExecuteRunRequest,
    RunExecutionResponse,
    RunStatusResponse,
    PlanApprovalRequest,
    PlanRejectionRequest,
)
from utils.logger import logger


class ExecutionService:
    """Manages LangGraph execution lifecycle and thread checkpoints."""

    def __init__(self):
        self.settings = get_settings()
        self._active_tasks: Dict[str, asyncio.Task] = {}

    async def execute_run(self, req: ExecuteRunRequest) -> RunExecutionResponse:
        """Initiates research execution for a run."""
        run = await run_repository.get_run(req.run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"ResearchRun {req.run_id} not found")

        thread_id = run.get("graphThreadId") or f"thread_{req.run_id}"

        # Update run status to RUNNING if not already
        await run_repository.update_status(
            run_id=req.run_id,
            status="RUNNING",
            graph_thread_id=thread_id,
        )

        # Emit RUN_STARTED event
        await event_repository.create_event(
            run_id=req.run_id,
            event_type="RUN_STARTED",
            message=f"Research run execution initialized for question: {run.get('question', '')[:60]}",
            agent_name="Orchestrator",
            payload={"thread_id": thread_id, "user_id": req.user_id},
        )

        logger.info(f"[ExecutionService] Initiated run {req.run_id} with thread {thread_id}")

        return RunExecutionResponse(
            success=True,
            run_id=req.run_id,
            message="Research run execution initialized successfully",
            status="RUNNING",
            graph_thread_id=thread_id,
        )

    async def pause_run(self, run_id: str) -> RunExecutionResponse:
        """Pauses research execution at current checkpoint."""
        run = await run_repository.get_run(run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"ResearchRun {run_id} not found")

        await run_repository.update_status(run_id=run_id, status="PAUSED")

        await event_repository.create_event(
            run_id=run_id,
            event_type="RUN_PAUSED",
            message="Research run execution paused",
            agent_name="Orchestrator",
        )

        return RunExecutionResponse(
            success=True,
            run_id=run_id,
            message="Research run paused successfully",
            status="PAUSED",
            graph_thread_id=run.get("graphThreadId"),
        )

    async def resume_run(self, run_id: str) -> RunExecutionResponse:
        """Resumes research execution from current checkpoint."""
        run = await run_repository.get_run(run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"ResearchRun {run_id} not found")

        await run_repository.update_status(run_id=run_id, status="RUNNING")

        await event_repository.create_event(
            run_id=run_id,
            event_type="RUN_RESUMED",
            message="Research run execution resumed",
            agent_name="Orchestrator",
        )

        return RunExecutionResponse(
            success=True,
            run_id=run_id,
            message="Research run resumed successfully",
            status="RUNNING",
            graph_thread_id=run.get("graphThreadId"),
        )

    async def cancel_run(self, run_id: str) -> RunExecutionResponse:
        """Cancels research execution."""
        run = await run_repository.get_run(run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"ResearchRun {run_id} not found")

        # Cancel any active in-memory task
        task = self._active_tasks.pop(run_id, None)
        if task and not task.done():
            task.cancel()

        await run_repository.update_status(run_id=run_id, status="CANCELLED")

        await event_repository.create_event(
            run_id=run_id,
            event_type="RUN_CANCELLED",
            message="Research run execution cancelled",
            agent_name="Orchestrator",
            severity="WARN",
        )

        return RunExecutionResponse(
            success=True,
            run_id=run_id,
            message="Research run cancelled successfully",
            status="CANCELLED",
            graph_thread_id=run.get("graphThreadId"),
        )

    async def retry_run(self, run_id: str) -> RunExecutionResponse:
        """Retries a failed or cancelled research run."""
        run = await run_repository.get_run(run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"ResearchRun {run_id} not found")

        thread_id = f"thread_{run_id}"
        await run_repository.update_status(
            run_id=run_id,
            status="RUNNING",
            graph_thread_id=thread_id,
        )

        await event_repository.create_event(
            run_id=run_id,
            event_type="RUN_RETRY",
            message="Research run execution retry initiated",
            agent_name="Orchestrator",
        )

        return RunExecutionResponse(
            success=True,
            run_id=run_id,
            message="Research run retried successfully",
            status="RUNNING",
            graph_thread_id=thread_id,
        )

    async def approve_plan(self, run_id: str, req: PlanApprovalRequest) -> RunExecutionResponse:
        """Approves plan and advances run state."""
        run = await run_repository.get_run(run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"ResearchRun {run_id} not found")

        await event_repository.create_event(
            run_id=run_id,
            event_type="PLAN_APPROVED",
            message=f"Research plan approved by {req.approved_by}",
            agent_name="Orchestrator",
            payload={"plan_id": req.plan_id, "approved_by": req.approved_by},
        )

        return RunExecutionResponse(
            success=True,
            run_id=run_id,
            message="Plan approval processed successfully",
            status=run.get("status"),
            graph_thread_id=run.get("graphThreadId"),
        )

    async def reject_plan(self, run_id: str, req: PlanRejectionRequest) -> RunExecutionResponse:
        """Rejects plan and logs feedback event."""
        run = await run_repository.get_run(run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"ResearchRun {run_id} not found")

        await event_repository.create_event(
            run_id=run_id,
            event_type="PLAN_REJECTED",
            message=f"Research plan rejected: {req.reason or 'No reason provided'}",
            agent_name="Orchestrator",
            severity="WARN",
            payload={"plan_id": req.plan_id, "reason": req.reason},
        )

        return RunExecutionResponse(
            success=True,
            run_id=run_id,
            message="Plan rejection processed successfully",
            status=run.get("status"),
            graph_thread_id=run.get("graphThreadId"),
        )

    async def get_status(self, run_id: str) -> RunStatusResponse:
        """Gets run status and checks whether checkpoint exists in Postgres."""
        run = await run_repository.get_run(run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"ResearchRun {run_id} not found")

        thread_id = run.get("graphThreadId")
        checkpoint_found = False

        if thread_id:
            try:
                async with checkpoint_manager.get_checkpointer() as checkpointer:
                    config = {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}
                    checkpoint = await checkpointer.aget(config)
                    checkpoint_found = checkpoint is not None
            except Exception as e:
                logger.warning(f"[ExecutionService] Checkpoint inspection error: {e}")

        return RunStatusResponse(
            run_id=run["id"],
            status=run["status"],
            graph_thread_id=thread_id,
            checkpoint_found=checkpoint_found,
            total_tokens=run.get("totalTokens", 0),
            question=run.get("question"),
            error_message=run.get("errorMessage"),
        )


# Global execution service instance
execution_service = ExecutionService()


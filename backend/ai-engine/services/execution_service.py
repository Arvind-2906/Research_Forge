"""ResearchForge AI Engine - Research Run Execution Service.

Coordinates LangGraph execution, thread state checkpoints, pause/resume/cancel lifecycles,
and event emissions.
"""

import asyncio
from typing import Optional, Dict, Any
from fastapi import HTTPException
from langgraph.types import Command

from config.settings import get_settings
from database.repositories import run_repository, event_repository
from graph.checkpointer import checkpoint_manager
from graph.graph_builder import graph_builder
from graph.state.state import ResearchState
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
        """Initiates research execution for a run and starts the LangGraph workflow."""
        run = await run_repository.get_run(req.run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"ResearchRun {req.run_id} not found")

        thread_id = run.get("graphThreadId") or f"thread_{req.run_id}"

        # Update run status to RUNNING
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

        config_data = run.get("configuration") or {}
        requires_approval = config_data.get("requires_approval", False)
        max_iterations = config_data.get("max_iterations", 2)

        # Prepare initial state
        initial_state: ResearchState = {
            "run_id": req.run_id,
            "user_id": req.user_id,
            "workspace_id": None,  # Will be enriched if project is linked
            "project_id": run.get("projectId"),
            "research_query": run.get("question", ""),
            "requires_approval": requires_approval,
            "plan_approved": not requires_approval,
            "research_iterations": 0,
            "max_iterations": max_iterations,
            "is_paused": False,
            "is_cancelled": False,
            "search_queries": [],
            "discovered_sources": [],
            "extracted_sources": [],
            "source_chunks": [],
            "claims": [],
            "evidence": [],
            "verification_results": [],
            "contradictions": [],
            "research_gaps": [],
            "errors": [],
            "execution_metadata": {},
        }

        # Spawn background LangGraph execution task
        bg_task = asyncio.create_task(
            self._run_graph_lifecycle(
                run_id=req.run_id,
                thread_id=thread_id,
                initial_state=initial_state,
            )
        )
        self._active_tasks[req.run_id] = bg_task

        logger.info(f"[ExecutionService] Initiated run {req.run_id} with thread {thread_id}")

        return RunExecutionResponse(
            success=True,
            run_id=req.run_id,
            message="Research run execution initialized successfully",
            status="RUNNING",
            graph_thread_id=thread_id,
        )

    async def _run_graph_lifecycle(
        self,
        run_id: str,
        thread_id: str,
        initial_state: Dict[str, Any],
    ) -> None:
        """Executes the compiled LangGraph workflow asynchronously in the background."""
        logger.info(f"[ExecutionService] Background graph starting for run {run_id}")
        try:
            async with checkpoint_manager.get_checkpointer() as checkpointer:
                compiled_graph = graph_builder.build(checkpointer=checkpointer)
                thread_config = {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}

                async for event in compiled_graph.astream(initial_state, config=thread_config):
                    for node_name, node_update in event.items():
                        phase = node_update.get("current_phase", node_name.upper())
                        status = node_update.get("current_status", "PROCESSING")
                        logger.info(f"[ExecutionService] Run {run_id} reached node '{node_name}' (status: {status})")

                        await event_repository.create_event(
                            run_id=run_id,
                            event_type=f"NODE_{node_name.upper()}_COMPLETED",
                            message=f"Node '{node_name}' finished execution step ({phase})",
                            agent_name=node_name,
                            payload={"status": status, "phase": phase},
                        )

            # Check if execution finished or is waiting for approval
            run = await run_repository.get_run(run_id)
            if run and run.get("status") not in ("PAUSED", "CANCELLED", "FAILED"):
                await run_repository.update_status(run_id=run_id, status="COMPLETED")
                await event_repository.create_event(
                    run_id=run_id,
                    event_type="RUN_COMPLETED",
                    message="Research run workflow completed successfully",
                    agent_name="Orchestrator",
                )
                logger.info(f"[ExecutionService] Run {run_id} completed successfully")

        except asyncio.CancelledError:
            logger.info(f"[ExecutionService] Run {run_id} cancelled.")
            await run_repository.update_status(run_id=run_id, status="CANCELLED")
        except Exception as e:
            logger.error(f"[ExecutionService] Error in run {run_id}: {e}", exc_info=True)
            await run_repository.update_status(
                run_id=run_id,
                status="FAILED",
                error_message=str(e),
            )
            await event_repository.create_event(
                run_id=run_id,
                event_type="RUN_FAILED",
                message=f"Research run failed: {str(e)}",
                agent_name="Orchestrator",
                severity="ERROR",
                payload={"error": str(e)},
            )
        finally:
            self._active_tasks.pop(run_id, None)

    async def pause_run(self, run_id: str) -> RunExecutionResponse:
        """Pauses research execution at current checkpoint."""
        run = await run_repository.get_run(run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"ResearchRun {run_id} not found")

        # Cancel active execution task if in progress
        task = self._active_tasks.pop(run_id, None)
        if task and not task.done():
            task.cancel()

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

        thread_id = run.get("graphThreadId") or f"thread_{run_id}"
        await run_repository.update_status(run_id=run_id, status="RUNNING")

        await event_repository.create_event(
            run_id=run_id,
            event_type="RUN_RESUMED",
            message="Research run execution resumed",
            agent_name="Orchestrator",
        )

        # Resume background graph
        bg_task = asyncio.create_task(
            self._resume_graph_lifecycle(
                run_id=run_id,
                thread_id=thread_id,
                resume_input=None,
            )
        )
        self._active_tasks[run_id] = bg_task

        return RunExecutionResponse(
            success=True,
            run_id=run_id,
            message="Research run resumed successfully",
            status="RUNNING",
            graph_thread_id=thread_id,
        )

    async def _resume_graph_lifecycle(
        self,
        run_id: str,
        thread_id: str,
        resume_input: Optional[Any] = None,
    ) -> None:
        """Resumes an interrupted or paused graph from checkpoint."""
        logger.info(f"[ExecutionService] Resuming graph for run {run_id}")
        try:
            async with checkpoint_manager.get_checkpointer() as checkpointer:
                compiled_graph = graph_builder.build(checkpointer=checkpointer)
                thread_config = {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}

                stream_input = Command(resume=resume_input) if resume_input is not None else None

                async for event in compiled_graph.astream(stream_input, config=thread_config):
                    for node_name, node_update in event.items():
                        phase = node_update.get("current_phase", node_name.upper())
                        status = node_update.get("current_status", "PROCESSING")
                        logger.info(f"[ExecutionService] Resumed run {run_id} node '{node_name}' ({status})")

                        await event_repository.create_event(
                            run_id=run_id,
                            event_type=f"NODE_{node_name.upper()}_COMPLETED",
                            message=f"Node '{node_name}' finished step after resume",
                            agent_name=node_name,
                            payload={"status": status, "phase": phase},
                        )

            # Check completion
            run = await run_repository.get_run(run_id)
            if run and run.get("status") not in ("PAUSED", "CANCELLED", "FAILED"):
                await run_repository.update_status(run_id=run_id, status="COMPLETED")
                await event_repository.create_event(
                    run_id=run_id,
                    event_type="RUN_COMPLETED",
                    message="Research run workflow completed successfully",
                    agent_name="Orchestrator",
                )

        except asyncio.CancelledError:
            logger.info(f"[ExecutionService] Resumed run {run_id} cancelled.")
            await run_repository.update_status(run_id=run_id, status="CANCELLED")
        except Exception as e:
            logger.error(f"[ExecutionService] Resumed run {run_id} error: {e}", exc_info=True)
            await run_repository.update_status(
                run_id=run_id,
                status="FAILED",
                error_message=str(e),
            )
        finally:
            self._active_tasks.pop(run_id, None)

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

        return await self.execute_run(
            ExecuteRunRequest(
                run_id=run_id,
                user_id=run.get("requestedById"),
            )
        )

    async def approve_plan(self, run_id: str, req: PlanApprovalRequest) -> RunExecutionResponse:
        """Approves plan and advances run state from approval gate."""
        run = await run_repository.get_run(run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"ResearchRun {run_id} not found")

        thread_id = run.get("graphThreadId") or f"thread_{run_id}"

        await event_repository.create_event(
            run_id=run_id,
            event_type="PLAN_APPROVED",
            message=f"Research plan approved by {req.approved_by}",
            agent_name="Orchestrator",
            payload={"plan_id": req.plan_id, "approved_by": req.approved_by},
        )

        # Resume the interrupted workflow with approval Command
        bg_task = asyncio.create_task(
            self._resume_graph_lifecycle(
                run_id=run_id,
                thread_id=thread_id,
                resume_input={"approved": True},
            )
        )
        self._active_tasks[run_id] = bg_task

        return RunExecutionResponse(
            success=True,
            run_id=run_id,
            message="Plan approval processed and execution resumed",
            status="RUNNING",
            graph_thread_id=thread_id,
        )

    async def reject_plan(self, run_id: str, req: PlanRejectionRequest) -> RunExecutionResponse:
        """Rejects plan and stops run state."""
        run = await run_repository.get_run(run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"ResearchRun {run_id} not found")

        task = self._active_tasks.pop(run_id, None)
        if task and not task.done():
            task.cancel()

        await run_repository.update_status(run_id=run_id, status="CANCELLED")

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
            status="CANCELLED",
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

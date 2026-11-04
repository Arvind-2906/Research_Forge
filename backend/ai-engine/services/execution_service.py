"""ResearchForge AI Engine - Research Run Execution Service.

Coordinates LangGraph execution, thread state checkpoints, pause/resume/cancel lifecycles,
and real-time event emissions (SSE / EventBus).
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


NODE_PROGRESS_MAP = {
    "intake": 10,
    "planner": 20,
    "plan_approval_gate": 25,
    "coordinator": 30,
    "web_research": 45,
    "document_research": 50,
    "source_extraction": 65,
    "evidence_extraction": 75,
    "verification": 80,
    "contradiction": 85,
    "gap_analysis": 88,
    "synthesis": 92,
    "citation_validation": 95,
    "report_generation": 98,
    "quality_review": 100,
}


class ExecutionService:
    """Manages LangGraph execution lifecycle, thread checkpoints, and live events."""

    def __init__(self):
        self.settings = get_settings()
        self._active_tasks: Dict[str, asyncio.Task] = {}

    async def execute_run(self, req: ExecuteRunRequest) -> RunExecutionResponse:
        """Initiates research execution for a run and starts the LangGraph workflow."""
        run = await run_repository.get_run(req.run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"ResearchRun {req.run_id} not found")

        prev_status = run.get("status", "QUEUED")
        thread_id = run.get("graphThreadId") or f"thread_{req.run_id}"

        # Update run status to RUNNING
        await run_repository.update_status(
            run_id=req.run_id,
            status="RUNNING",
            graph_thread_id=thread_id,
        )

        # Emit run.status_changed
        await event_repository.create_event(
            run_id=req.run_id,
            event_type="run.status_changed",
            message=f"Run status changed from {prev_status} to RUNNING",
            agent_name="Orchestrator",
            payload={"previous_status": prev_status, "new_status": "RUNNING"},
        )

        # Emit run.started event
        await event_repository.create_event(
            run_id=req.run_id,
            event_type="run.started",
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
            "workspace_id": None,
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

    async def _handle_node_event(self, run_id: str, node_name: str, node_update: Dict[str, Any]) -> None:
        """Emits standard agent progress and domain-specific events for a completed node."""
        phase = node_update.get("current_phase", node_name.upper())
        status = node_update.get("current_status", "PROCESSING")
        progress_pct = NODE_PROGRESS_MAP.get(node_name, 50)

        # 1. Agent completed event
        await event_repository.create_event(
            run_id=run_id,
            event_type="agent.completed",
            message=f"Agent '{node_name}' completed execution step ({phase})",
            agent_name=node_name,
            payload={"node": node_name, "status": status, "phase": phase},
        )

        # 2. Agent progress event
        await event_repository.create_event(
            run_id=run_id,
            event_type="agent.progress",
            message=f"Workflow progress: {progress_pct}% (Node: {node_name})",
            agent_name=node_name,
            payload={"progress": progress_pct, "node": node_name, "phase": phase},
        )

        # 3. Domain-specific events
        if node_name in ("web_research", "document_research"):
            sources = node_update.get("discovered_sources") or []
            chunks = node_update.get("source_chunks") or []
            count = len(sources) or len(chunks)
            if count > 0:
                await event_repository.create_event(
                    run_id=run_id,
                    event_type="source.discovered",
                    message=f"Discovered {count} research sources via {node_name}",
                    agent_name=node_name,
                    payload={"source_count": count},
                )
        elif node_name == "source_extraction":
            extracted = node_update.get("extracted_sources") or []
            await event_repository.create_event(
                run_id=run_id,
                event_type="source.extracted",
                message=f"Extracted content from {len(extracted)} sources",
                agent_name=node_name,
                payload={"extracted_count": len(extracted)},
            )
        elif node_name == "evidence_extraction":
            claims = node_update.get("claims") or []
            evidence = node_update.get("evidence") or []
            await event_repository.create_event(
                run_id=run_id,
                event_type="evidence.extracted",
                message=f"Extracted {len(claims)} claims and {len(evidence)} evidence items",
                agent_name=node_name,
                payload={"claim_count": len(claims), "evidence_count": len(evidence)},
            )
        elif node_name == "synthesis":
            await event_repository.create_event(
                run_id=run_id,
                event_type="report.generating",
                message="Synthesizing findings into structured draft sections",
                agent_name=node_name,
            )
        elif node_name in ("report_generation", "quality_review"):
            report = node_update.get("report") or {}
            await event_repository.create_event(
                run_id=run_id,
                event_type="report.completed",
                message="Final research report generated successfully",
                agent_name=node_name,
                payload={"report_title": report.get("title")},
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
                        await self._handle_node_event(run_id, node_name, node_update)

            # Check if execution finished or is waiting for approval
            run = await run_repository.get_run(run_id)
            if run and run.get("status") not in ("PAUSED", "CANCELLED", "FAILED"):
                prev_status = run.get("status")
                await run_repository.update_status(run_id=run_id, status="COMPLETED")
                await event_repository.create_event(
                    run_id=run_id,
                    event_type="run.status_changed",
                    message="Run status changed to COMPLETED",
                    agent_name="Orchestrator",
                    payload={"previous_status": prev_status, "new_status": "COMPLETED"},
                )
                await event_repository.create_event(
                    run_id=run_id,
                    event_type="run.completed",
                    message="Research run workflow completed successfully",
                    agent_name="Orchestrator",
                )
                logger.info(f"[ExecutionService] Run {run_id} completed successfully")

        except asyncio.CancelledError:
            logger.info(f"[ExecutionService] Run {run_id} cancelled.")
            await run_repository.update_status(run_id=run_id, status="CANCELLED")
            await event_repository.create_event(
                run_id=run_id,
                event_type="run.status_changed",
                message="Run status changed to CANCELLED",
                agent_name="Orchestrator",
                payload={"new_status": "CANCELLED"},
            )
            await event_repository.create_event(
                run_id=run_id,
                event_type="run.cancelled",
                message="Research run execution was cancelled",
                agent_name="Orchestrator",
                severity="WARNING",
            )
        except Exception as e:
            logger.error(f"[ExecutionService] Error in run {run_id}: {e}", exc_info=True)
            await run_repository.update_status(
                run_id=run_id,
                status="FAILED",
                error_message=str(e),
            )
            await event_repository.create_event(
                run_id=run_id,
                event_type="run.status_changed",
                message="Run status changed to FAILED",
                agent_name="Orchestrator",
                severity="ERROR",
                payload={"new_status": "FAILED", "error": str(e)},
            )
            await event_repository.create_event(
                run_id=run_id,
                event_type="run.failed",
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

        prev_status = run.get("status")

        # Cancel active execution task if in progress
        task = self._active_tasks.pop(run_id, None)
        if task and not task.done():
            task.cancel()

        await run_repository.update_status(run_id=run_id, status="PAUSED")

        await event_repository.create_event(
            run_id=run_id,
            event_type="run.status_changed",
            message="Run status changed to PAUSED",
            agent_name="Orchestrator",
            payload={"previous_status": prev_status, "new_status": "PAUSED"},
        )
        await event_repository.create_event(
            run_id=run_id,
            event_type="run.paused",
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

        prev_status = run.get("status")
        thread_id = run.get("graphThreadId") or f"thread_{run_id}"
        await run_repository.update_status(run_id=run_id, status="RUNNING")

        await event_repository.create_event(
            run_id=run_id,
            event_type="run.status_changed",
            message="Run status changed to RUNNING",
            agent_name="Orchestrator",
            payload={"previous_status": prev_status, "new_status": "RUNNING"},
        )
        await event_repository.create_event(
            run_id=run_id,
            event_type="run.resumed",
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
                        await self._handle_node_event(run_id, node_name, node_update)

            # Check completion
            run = await run_repository.get_run(run_id)
            if run and run.get("status") not in ("PAUSED", "CANCELLED", "FAILED"):
                prev_status = run.get("status")
                await run_repository.update_status(run_id=run_id, status="COMPLETED")
                await event_repository.create_event(
                    run_id=run_id,
                    event_type="run.status_changed",
                    message="Run status changed to COMPLETED",
                    agent_name="Orchestrator",
                    payload={"previous_status": prev_status, "new_status": "COMPLETED"},
                )
                await event_repository.create_event(
                    run_id=run_id,
                    event_type="run.completed",
                    message="Research run workflow completed successfully",
                    agent_name="Orchestrator",
                )

        except asyncio.CancelledError:
            logger.info(f"[ExecutionService] Resumed run {run_id} cancelled.")
            await run_repository.update_status(run_id=run_id, status="CANCELLED")
            await event_repository.create_event(
                run_id=run_id,
                event_type="run.status_changed",
                message="Run status changed to CANCELLED",
                agent_name="Orchestrator",
                payload={"new_status": "CANCELLED"},
            )
            await event_repository.create_event(
                run_id=run_id,
                event_type="run.cancelled",
                message="Research run execution was cancelled",
                agent_name="Orchestrator",
                severity="WARNING",
            )
        except Exception as e:
            logger.error(f"[ExecutionService] Resumed run {run_id} error: {e}", exc_info=True)
            await run_repository.update_status(
                run_id=run_id,
                status="FAILED",
                error_message=str(e),
            )
            await event_repository.create_event(
                run_id=run_id,
                event_type="run.status_changed",
                message="Run status changed to FAILED",
                agent_name="Orchestrator",
                severity="ERROR",
                payload={"new_status": "FAILED", "error": str(e)},
            )
            await event_repository.create_event(
                run_id=run_id,
                event_type="run.failed",
                message=f"Research run failed: {str(e)}",
                agent_name="Orchestrator",
                severity="ERROR",
                payload={"error": str(e)},
            )
        finally:
            self._active_tasks.pop(run_id, None)

    async def cancel_run(self, run_id: str) -> RunExecutionResponse:
        """Cancels research execution."""
        run = await run_repository.get_run(run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"ResearchRun {run_id} not found")

        prev_status = run.get("status")

        # Cancel any active in-memory task
        task = self._active_tasks.pop(run_id, None)
        if task and not task.done():
            task.cancel()

        await run_repository.update_status(run_id=run_id, status="CANCELLED")

        await event_repository.create_event(
            run_id=run_id,
            event_type="run.status_changed",
            message="Run status changed to CANCELLED",
            agent_name="Orchestrator",
            payload={"previous_status": prev_status, "new_status": "CANCELLED"},
        )
        await event_repository.create_event(
            run_id=run_id,
            event_type="run.cancelled",
            message="Research run execution cancelled",
            agent_name="Orchestrator",
            severity="WARNING",
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
            event_type="run.retry",
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
            event_type="plan.approved",
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
            event_type="run.status_changed",
            message="Run status changed to CANCELLED",
            agent_name="Orchestrator",
            payload={"new_status": "CANCELLED"},
        )
        await event_repository.create_event(
            run_id=run_id,
            event_type="plan.rejected",
            message=f"Research plan rejected: {req.reason or 'No reason provided'}",
            agent_name="Orchestrator",
            severity="WARNING",
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

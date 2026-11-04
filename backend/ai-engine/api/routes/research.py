"""ResearchForge AI Engine - Research Lifecycle API Routes.

Internal endpoints for research execution, pause, resume, cancel, plan approval,
checkpoint status inspection, real-time SSE event streaming, and execution history.
Protected by X-Internal-Service-Key.
"""

import json
import asyncio
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Request, Header, Query, HTTPException
from sse_starlette.sse import EventSourceResponse, ServerSentEvent

from api.dependencies.auth import verify_internal_service_key
from database.repositories import run_repository, event_repository
from schemas.execution import (
    ExecuteRunRequest,
    RunExecutionResponse,
    RunStatusResponse,
    PlanApprovalRequest,
    PlanRejectionRequest,
)
from services.event_bus import event_bus
from services.execution_service import execution_service
from utils.logger import logger

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


@router.get("/{run_id}/events")
async def stream_research_events(
    run_id: str,
    request: Request,
    last_event_id: Optional[str] = Header(None, alias="Last-Event-ID"),
    last_event_id_query: Optional[str] = Query(None, alias="last_event_id"),
    after_sequence: Optional[int] = Query(None),
    max_events: Optional[int] = Query(None, description="Optional cap on events for testing/batching"),
):
    """Real-time SSE event stream for a research run with reconnection replay, sequencing, and heartbeats."""
    run = await run_repository.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"ResearchRun {run_id} not found")

    effective_last_id = last_event_id or last_event_id_query

    async def event_generator():
        # 1. Register listener with event bus first to avoid race conditions
        queue = await event_bus.subscribe(run_id)
        highest_seq_seen = 0
        yielded_count = 0

        try:
            # 2. Replay historical events if reconnecting or starting stream
            historical_events = []
            if after_sequence is not None:
                historical_events = await event_repository.get_events_after_sequence(
                    run_id=run_id, after_sequence=after_sequence, limit=1000
                )
            elif effective_last_id is not None:
                historical_events = await event_repository.get_events_after_id(
                    run_id=run_id, last_event_id=effective_last_id, limit=1000
                )
            else:
                historical_events = await event_repository.get_events_for_run(
                    run_id=run_id, limit=1000
                )

            for evt in historical_events:
                seq = evt.get("sequence", 0)
                if seq > highest_seq_seen:
                    highest_seq_seen = seq
                yield ServerSentEvent(
                    id=str(evt.get("id", seq)),
                    event=evt.get("eventType", "message"),
                    data=json.dumps(evt, default=str),
                )
                yielded_count += 1
                if max_events is not None and yielded_count >= max_events:
                    return

            # 3. Stream real-time events as they arrive
            while True:
                try:
                    event_data = await asyncio.wait_for(queue.get(), timeout=10.0)
                    seq = event_data.get("sequence", 0)

                    # Deduplication guard against replayed events
                    if seq <= highest_seq_seen:
                        continue

                    highest_seq_seen = seq
                    yield ServerSentEvent(
                        id=str(event_data.get("id", seq)),
                        event=event_data.get("eventType", "message"),
                        data=json.dumps(event_data, default=str),
                    )
                    yielded_count += 1
                    if max_events is not None and yielded_count >= max_events:
                        return

                except asyncio.TimeoutError:
                    # Send periodic keepalive heartbeat if queue was idle
                    yield ServerSentEvent(
                        event="ping",
                        data=json.dumps({"ping": True, "run_id": run_id}),
                    )

        except asyncio.CancelledError:
            logger.info(f"[SSE] Stream connection cancelled for run {run_id}")
        finally:
            await event_bus.unsubscribe(run_id, queue)

    return EventSourceResponse(
        event_generator(),
        ping=15 if max_events is None else None,
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{run_id}/history")
async def get_research_history(
    run_id: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    after_sequence: Optional[int] = Query(None),
):
    """Retrieves persistent execution event history for a run."""
    run = await run_repository.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"ResearchRun {run_id} not found")

    if after_sequence is not None:
        events = await event_repository.get_events_after_sequence(
            run_id=run_id, after_sequence=after_sequence, limit=limit
        )
    else:
        events = await event_repository.get_events_for_run(
            run_id=run_id, limit=limit, offset=offset
        )

    return {
        "success": True,
        "run_id": run_id,
        "count": len(events),
        "events": events,
    }

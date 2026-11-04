"""ResearchForge AI Engine - Real-Time Events & Execution Tests.

Tests for event creation, monotonic sequence allocation, payload sanitization,
pub/sub event bus, SSE streaming, Last-Event-ID replay, and concurrent run isolation.
"""

import sys
import asyncio
import json
import pytest
import httpx
from httpx import ASGITransport
from httpx_sse import aconnect_sse

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from main import app
from config.settings import get_settings
from database.connection import db
from database.repositories import event_repository, run_repository
from database.repositories.event_repository import sanitize_payload
from services.event_bus import event_bus
from services.execution_service import execution_service
from utils.id_generator import generate_cuid


@pytest.fixture
def auth_headers():
    settings = get_settings()
    return {"X-Internal-Service-Key": settings.INTERNAL_SERVICE_SECRET}


async def setup_test_run(run_id: str):
    """Sets up user, workspace, project, and run records in the database."""
    async with db.get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO "User" (id, name, email, "emailVerified", "createdAt", "updatedAt")
                VALUES ('user_test_shared', 'Test User', 'testshared@example.com', true, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
                """
            )
            await cur.execute(
                """
                INSERT INTO "Workspace" (id, name, "ownerId", "createdAt", "updatedAt")
                VALUES ('ws_test_shared', 'Test Workspace', 'user_test_shared', NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
                """
            )
            await cur.execute(
                """
                INSERT INTO "ResearchProject" (id, title, "workspaceId", "createdById", "createdAt", "updatedAt")
                VALUES ('proj_test_shared', 'Test Project', 'ws_test_shared', 'user_test_shared', NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
                """
            )
            await cur.execute(
                """
                INSERT INTO "ResearchRun" (id, question, status, "projectId", "requestedById", "createdAt", "updatedAt")
                VALUES (%s, 'Test Question', 'RUNNING', 'proj_test_shared', 'user_test_shared', NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
                """,
                (run_id,),
            )


async def cleanup_test_run(*run_ids: str):
    """Cleans up events and runs created during tests."""
    async with db.get_connection() as conn:
        async with conn.cursor() as cur:
            for r_id in run_ids:
                await cur.execute('DELETE FROM "ResearchEvent" WHERE "runId" = %s', (r_id,))
                await cur.execute('DELETE FROM "ResearchRun" WHERE id = %s', (r_id,))


def test_payload_sanitization():
    """Verifies recursive credential & secret redaction in event payloads."""
    payload = {
        "user": "Alice",
        "api_key": "groq_secret_12345",
        "nested": {
            "token": "bearer_xyz_789",
            "password": "supersecretpassword",
            "valid_key": "safe_value",
            "authorization": "Bearer token_abc",
        },
        "list_items": [
            {"service_token": "secret_tok", "name": "service1"},
            {"public_info": "visible"},
        ],
    }

    sanitized = sanitize_payload(payload)

    assert sanitized["user"] == "Alice"
    assert sanitized["api_key"] == "[REDACTED]"
    assert sanitized["nested"]["token"] == "[REDACTED]"
    assert sanitized["nested"]["password"] == "[REDACTED]"
    assert sanitized["nested"]["authorization"] == "[REDACTED]"
    assert sanitized["nested"]["valid_key"] == "safe_value"
    assert sanitized["list_items"][0]["service_token"] == "[REDACTED]"
    assert sanitized["list_items"][0]["name"] == "service1"
    assert sanitized["list_items"][1]["public_info"] == "visible"


@pytest.mark.asyncio
async def test_event_bus_isolation_and_dispatch():
    """Verifies that the pub/sub event bus routes events only to subscribers of the matching run."""
    run_1 = "run_bus_test_1"
    run_2 = "run_bus_test_2"

    queue_1 = await event_bus.subscribe(run_1)
    queue_2 = await event_bus.subscribe(run_2)

    try:
        assert event_bus.active_subscribers_count(run_1) == 1
        assert event_bus.active_subscribers_count(run_2) == 1

        # Publish event for run_1
        delivered = await event_bus.publish(run_1, {"eventType": "agent.started", "sequence": 1})
        assert delivered == 1

        # queue_1 should receive it immediately
        msg_1 = await asyncio.wait_for(queue_1.get(), timeout=2.0)
        assert msg_1["eventType"] == "agent.started"

        # queue_2 should have received nothing
        assert queue_2.empty()

    finally:
        await event_bus.unsubscribe(run_1, queue_1)
        await event_bus.unsubscribe(run_2, queue_2)

    assert event_bus.active_subscribers_count(run_1) == 0
    assert event_bus.active_subscribers_count(run_2) == 0


@pytest.mark.asyncio
async def test_event_creation_and_monotonic_sequence():
    """Verifies that database event creation produces strictly ordered monotonic sequence numbers."""
    test_run_id = generate_cuid("run_seq_")
    await setup_test_run(test_run_id)

    try:
        # Create 5 sequential events
        evt1 = await event_repository.create_event(
            run_id=test_run_id,
            event_type="run.started",
            message="Run started",
            severity="INFO",
        )
        evt2 = await event_repository.create_event(
            run_id=test_run_id,
            event_type="agent.started",
            message="Agent started",
            severity="INFO",
        )
        evt3 = await event_repository.create_event(
            run_id=test_run_id,
            event_type="agent.progress",
            message="Progress at 50%",
            severity="WARN",  # Checks normalization to WARNING
        )
        evt4 = await event_repository.create_event(
            run_id=test_run_id,
            event_type="source.discovered",
            message="Found 3 sources",
            severity="INFO",
        )
        evt5 = await event_repository.create_event(
            run_id=test_run_id,
            event_type="run.completed",
            message="Run completed",
            severity="INFO",
        )

        assert evt1["sequence"] == 1
        assert evt2["sequence"] == 2
        assert evt3["sequence"] == 3
        assert evt3["severity"] == "WARNING"  # normalized from WARN
        assert evt4["sequence"] == 4
        assert evt5["sequence"] == 5

        # Test Reconnection: get events after sequence 2
        after_seq2 = await event_repository.get_events_after_sequence(test_run_id, after_sequence=2)
        assert len(after_seq2) == 3
        assert [e["sequence"] for e in after_seq2] == [3, 4, 5]

        # Test Reconnection: get events after event ID
        after_id = await event_repository.get_events_after_id(test_run_id, last_event_id=evt3["id"])
        assert len(after_id) == 2
        assert [e["sequence"] for e in after_id] == [4, 5]

    finally:
        await cleanup_test_run(test_run_id)


@pytest.mark.asyncio
async def test_concurrent_research_runs_isolation():
    """Verifies that concurrent event emissions across different runs maintain strict isolation and independent sequence numbering."""
    run_a = generate_cuid("run_conc_a_")
    run_b = generate_cuid("run_conc_b_")

    await setup_test_run(run_a)
    await setup_test_run(run_b)

    try:
        async def emit_batch(run_id: str, count: int):
            results = []
            for i in range(count):
                evt = await event_repository.create_event(
                    run_id=run_id,
                    event_type=f"event.{i+1}",
                    message=f"Message {i+1} for {run_id}",
                )
                results.append(evt)
            return results

        # Run both batches concurrently
        batch_a, batch_b = await asyncio.gather(
            emit_batch(run_a, 4),
            emit_batch(run_b, 4),
        )

        # Sequences must be strictly 1, 2, 3, 4 for both runs independently
        seqs_a = [e["sequence"] for e in batch_a]
        seqs_b = [e["sequence"] for e in batch_b]

        assert seqs_a == [1, 2, 3, 4]
        assert seqs_b == [1, 2, 3, 4]

        # Verify database records
        events_a = await event_repository.get_events_for_run(run_a)
        events_b = await event_repository.get_events_for_run(run_b)

        assert len(events_a) == 4
        assert len(events_b) == 4
        assert all(e["runId"] == run_a for e in events_a)
        assert all(e["runId"] == run_b for e in events_b)

    finally:
        await cleanup_test_run(run_a, run_b)


@pytest.mark.asyncio
async def test_sse_endpoint_history_and_streaming(auth_headers):
    """Verifies that GET /api/v1/research/{run_id}/events streams SSE events and replays history."""
    test_run_id = generate_cuid("run_sse_test_")
    await setup_test_run(test_run_id)

    try:
        # Pre-populate one event in the database
        await event_repository.create_event(
            run_id=test_run_id,
            event_type="run.started",
            message="Pre-existing event before client connection",
        )

        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Test history endpoint
            history_res = await client.get(
                f"/api/v1/research/{test_run_id}/history",
                headers=auth_headers,
            )
            assert history_res.status_code == 200
            history_data = history_res.json()
            assert history_data["success"] is True
            assert history_data["count"] >= 1
            assert history_data["events"][0]["eventType"] == "run.started"

            # 2. Test SSE streaming endpoint with historical replay (capped via max_events)
            sse_res = await client.get(
                f"/api/v1/research/{test_run_id}/events?max_events=1",
                headers=auth_headers,
            )
            assert sse_res.status_code == 200
            assert "text/event-stream" in sse_res.headers.get("content-type", "")
            assert "event: run.started" in sse_res.text
            assert "Pre-existing event before client connection" in sse_res.text

            # 3. Create a second event in the database
            evt2 = await event_repository.create_event(
                run_id=test_run_id,
                event_type="agent.progress",
                message="Workflow progressing to discovery",
                payload={"progress": 40},
            )

            # 4. Test Last-Event-ID reconnection replay
            reconnect_res = await client.get(
                f"/api/v1/research/{test_run_id}/events?after_sequence=1&max_events=1",
                headers=auth_headers,
            )
            assert reconnect_res.status_code == 200
            assert "event: agent.progress" in reconnect_res.text
            assert "Workflow progressing to discovery" in reconnect_res.text

    finally:
        await cleanup_test_run(test_run_id)

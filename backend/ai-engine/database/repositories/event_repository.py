"""ResearchForge AI Engine - Research Event Repository.

Direct async repository for ResearchEvent entity for audit logging,
concurrency-safe sequence allocation, reconnection replay, and SSE streaming.
"""

import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from psycopg.rows import dict_row

from database.connection import db
from utils.id_generator import generate_cuid
from utils.logger import logger


SENSITIVE_KEYS = {"api_key", "apikey", "secret", "token", "password", "authorization", "bearer"}


def sanitize_payload(obj: Any) -> Any:
    """Recursively redacts secrets and sensitive credentials from event payloads."""
    if isinstance(obj, dict):
        sanitized = {}
        for k, v in obj.items():
            if any(s in k.lower() for s in SENSITIVE_KEYS):
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = sanitize_payload(v)
        return sanitized
    elif isinstance(obj, list):
        return [sanitize_payload(item) for item in obj]
    return obj


class EventRepository:
    """Provides concurrency-safe database operations for ResearchEvent."""

    async def create_event(
        self,
        run_id: str,
        event_type: str,
        message: Optional[str] = None,
        agent_name: Optional[str] = None,
        severity: str = "INFO",
        payload: Optional[Dict[str, Any]] = None,
        event_key: Optional[str] = None,
        task_id: Optional[str] = None,
        agent_execution_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates and persists a new ResearchEvent with concurrency-safe sequence allocation."""
        event_id = generate_cuid("evt_")
        now = datetime.now(timezone.utc)
        safe_payload = sanitize_payload(payload) if payload is not None else None
        payload_json = json.dumps(safe_payload) if safe_payload is not None else None

        # Normalize severity to valid EventSeverity enum: DEBUG, INFO, WARNING, ERROR
        norm_severity = (severity or "INFO").upper()
        if norm_severity in ("WARN", "WARNING"):
            norm_severity = "WARNING"
        elif norm_severity not in ("DEBUG", "INFO", "WARNING", "ERROR"):
            norm_severity = "INFO"

        # Use an advisory transaction lock per runId to ensure atomic sequential ordering
        query = """
            WITH lock AS (
                SELECT pg_advisory_xact_lock(hashtext(%s))
            ),
            next_seq AS (
                SELECT COALESCE(MAX(sequence), 0) + 1 AS seq
                FROM "ResearchEvent"
                WHERE "runId" = %s
            )
            INSERT INTO "ResearchEvent" (
                id, sequence, "eventType", severity, "agentName", message,
                payload, "eventKey", "runId", "taskId", "agentExecutionId", "createdAt"
            )
            SELECT
                %s,
                next_seq.seq,
                %s,
                %s::"EventSeverity",
                %s,
                %s,
                %s::jsonb,
                %s,
                %s,
                %s,
                %s,
                %s
            FROM next_seq
            RETURNING id, sequence, "eventType", severity, "agentName", message, payload, "eventKey", "runId", "createdAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (
                        run_id,
                        run_id,
                        event_id,
                        event_type,
                        norm_severity,
                        agent_name,
                        message,
                        payload_json,
                        event_key,
                        run_id,
                        task_id,
                        agent_execution_id,
                        now,
                    ),
                )
                event = await cur.fetchone()
                logger.info(
                    f"[ResearchEvent] Run: {run_id} | Seq: {event['sequence']} | Type: {event_type} | Agent: {agent_name} | Msg: {(message or '')[:60]}"
                )

                # Broadcast live event to all active SSE subscribers
                try:
                    from services.event_bus import event_bus
                    await event_bus.publish(run_id, dict(event))
                except Exception as eb_err:
                    logger.debug(f"[ResearchEvent] EventBus broadcast notice: {eb_err}")

                return event

    async def get_events_for_run(
        self,
        run_id: str,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Fetches events for a given run in chronological order."""
        query = """
            SELECT id, sequence, "eventType", severity, "agentName", message,
                   payload, "eventKey", "runId", "createdAt"
            FROM "ResearchEvent"
            WHERE "runId" = %s
            ORDER BY sequence ASC
            LIMIT %s OFFSET %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (run_id, limit, offset))
                return await cur.fetchall()

    async def get_events_after_sequence(
        self,
        run_id: str,
        after_sequence: int,
        limit: int = 500,
    ) -> List[Dict[str, Any]]:
        """Fetches missed events after a given sequence number for SSE reconnection."""
        query = """
            SELECT id, sequence, "eventType", severity, "agentName", message,
                   payload, "eventKey", "runId", "createdAt"
            FROM "ResearchEvent"
            WHERE "runId" = %s AND sequence > %s
            ORDER BY sequence ASC
            LIMIT %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (run_id, after_sequence, limit))
                return await cur.fetchall()

    async def get_events_after_id(
        self,
        run_id: str,
        last_event_id: str,
        limit: int = 500,
    ) -> List[Dict[str, Any]]:
        """Finds sequence of last_event_id (or parses as sequence number) and fetches all subsequent events."""
        if str(last_event_id).strip().isdigit():
            return await self.get_events_after_sequence(run_id, int(last_event_id), limit=limit)

        query = """
            WITH target_event AS (
                SELECT sequence FROM "ResearchEvent" WHERE id = %s AND "runId" = %s
            )
            SELECT e.id, e.sequence, e."eventType", e.severity, e."agentName", e.message,
                   e.payload, e."eventKey", e."runId", e."createdAt"
            FROM "ResearchEvent" e
            WHERE e."runId" = %s
              AND e.sequence > COALESCE((SELECT sequence FROM target_event), 0)
            ORDER BY e.sequence ASC
            LIMIT %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (last_event_id, run_id, run_id, limit))
                return await cur.fetchall()

    async def get_latest_sequence(self, run_id: str) -> int:
        """Returns the highest sequence number recorded for a run."""
        query = 'SELECT COALESCE(MAX(sequence), 0) AS seq FROM "ResearchEvent" WHERE "runId" = %s'
        async with db.get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, (run_id,))
                row = await cur.fetchone()
                return row[0] if row else 0


# Global event repository instance
event_repository = EventRepository()

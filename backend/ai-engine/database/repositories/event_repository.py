"""ResearchForge AI Engine - Research Event Repository.

Direct async repository for ResearchEvent entity for audit logging and SSE streaming.
"""

import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from psycopg.rows import dict_row

from database.connection import db
from utils.id_generator import generate_cuid
from utils.logger import logger


class EventRepository:
    """Provides database operations for ResearchEvent."""

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
        """Creates and persists a new ResearchEvent with sequential ordering."""
        event_id = generate_cuid("evt_")
        now = datetime.now(timezone.utc)
        payload_json = json.dumps(payload) if payload is not None else None

        query = """
            INSERT INTO "ResearchEvent" (
                id, sequence, "eventType", severity, "agentName", message,
                payload, "eventKey", "runId", "taskId", "agentExecutionId", "createdAt"
            )
            VALUES (
                %s,
                COALESCE((SELECT MAX(sequence) FROM "ResearchEvent" WHERE "runId" = %s), 0) + 1,
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
            )
            RETURNING id, sequence, "eventType", severity, "agentName", message, payload, "eventKey", "runId", "createdAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (
                        event_id,
                        run_id,
                        event_type,
                        severity,
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


# Global event repository instance
event_repository = EventRepository()

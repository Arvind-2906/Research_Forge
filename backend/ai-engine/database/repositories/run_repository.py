"""ResearchForge AI Engine - Research Run Repository.

Direct async repository for ResearchRun and ResearchPlan entities.
"""

import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from psycopg.rows import dict_row

from database.connection import db
from utils.id_generator import generate_cuid
from utils.logger import logger


class RunRepository:
    """Provides database operations for ResearchRun and ResearchPlan."""

    async def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Fetches a single ResearchRun by ID."""
        query = """
            SELECT id, question, status, configuration, "configurationVersion",
                   "graphThreadId", "startedAt", "pausedAt", "completedAt",
                   "errorCode", "errorMessage", "totalTokens", metadata,
                   "projectId", "requestedById", "createdAt", "updatedAt"
            FROM "ResearchRun"
            WHERE id = %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (run_id,))
                return await cur.fetchone()

    async def update_status(
        self,
        run_id: str,
        status: str,
        graph_thread_id: Optional[str] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> bool:
        """Updates the status and metadata of a ResearchRun."""
        now = datetime.now(timezone.utc)
        updates = ['status = %s::"ResearchRunStatus"', '"updatedAt" = %s']
        params = [status, now]

        if graph_thread_id is not None:
            updates.append('"graphThreadId" = %s')
            params.append(graph_thread_id)

        if error_code is not None:
            updates.append('"errorCode" = %s')
            params.append(error_code)

        if error_message is not None:
            updates.append('"errorMessage" = %s')
            params.append(error_message)

        if status == "RUNNING":
            updates.append('"startedAt" = COALESCE("startedAt", %s)')
            params.append(now)
        elif status == "PAUSED":
            updates.append('"pausedAt" = %s')
            params.append(now)
        elif status in ("COMPLETED", "FAILED", "CANCELLED"):
            updates.append('"completedAt" = %s')
            params.append(now)

        params.append(run_id)
        query = f'UPDATE "ResearchRun" SET {", ".join(updates)} WHERE id = %s'

        async with db.get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, params)
                return cur.rowcount > 0

    async def increment_tokens(
        self,
        run_id: str,
        tokens_to_add: int,
    ) -> bool:
        """Increments total token count for a run."""
        now = datetime.now(timezone.utc)
        query = """
            UPDATE "ResearchRun"
            SET "totalTokens" = "totalTokens" + %s,
                "updatedAt" = %s
            WHERE id = %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, (tokens_to_add, now, run_id))
                return cur.rowcount > 0

    async def get_latest_plan(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Fetches the latest ResearchPlan for a run."""
        query = """
            SELECT id, version, objective, content, status, "approvedAt",
                   "approvedById", "runId", "createdAt", "updatedAt"
            FROM "ResearchPlan"
            WHERE "runId" = %s
            ORDER BY version DESC
            LIMIT 1
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (run_id,))
                return await cur.fetchone()

    async def create_or_update_plan(
        self,
        run_id: str,
        objective: str,
        content: Any,
        status: str = "DRAFT",
    ) -> Dict[str, Any]:
        """Creates a new version or updates latest plan for a run."""
        now = datetime.now(timezone.utc)
        content_json = json.dumps(content) if not isinstance(content, str) else content

        latest = await self.get_latest_plan(run_id)
        if latest and latest["status"] == "DRAFT":
            query = """
                UPDATE "ResearchPlan"
                SET objective = %s,
                    content = %s::jsonb,
                    status = %s::"PlanStatus",
                    "updatedAt" = %s
                WHERE id = %s
                RETURNING id, version, objective, content, status, "runId", "createdAt", "updatedAt"
            """
            async with db.get_connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cur:
                    await cur.execute(query, (objective, content_json, status, now, latest["id"]))
                    return await cur.fetchone()
        else:
            version = (latest["version"] + 1) if latest else 1
            plan_id = generate_cuid("pln_")
            query = """
                INSERT INTO "ResearchPlan" (
                    id, version, objective, content, status, "runId", "createdAt", "updatedAt"
                )
                VALUES (%s, %s, %s, %s::jsonb, %s::"PlanStatus", %s, %s, %s)
                RETURNING id, version, objective, content, status, "runId", "createdAt", "updatedAt"
            """
            async with db.get_connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cur:
                    await cur.execute(query, (plan_id, version, objective, content_json, status, run_id, now, now))
                    return await cur.fetchone()


# Global run repository instance
run_repository = RunRepository()

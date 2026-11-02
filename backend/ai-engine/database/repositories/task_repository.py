"""ResearchForge AI Engine - Research Task Repository.

Direct async repository for ResearchTask and ResearchTaskDependency entities.
"""

import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from psycopg.rows import dict_row

from database.connection import db
from utils.id_generator import generate_cuid
from utils.logger import logger


class TaskRepository:
    """Provides database operations for ResearchTask and ResearchTaskDependency."""

    async def create_task(
        self,
        run_id: str,
        title: str,
        description: Optional[str] = None,
        assigned_agent: Optional[str] = None,
        priority: int = 3,
        plan_id: Optional[str] = None,
        input_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Creates a new ResearchTask."""
        task_id = generate_cuid("tsk_")
        now = datetime.now(timezone.utc)
        input_json = json.dumps(input_data) if input_data is not None else None

        query = """
            INSERT INTO "ResearchTask" (
                id, title, description, "assignedAgent", status, priority,
                input, "attemptCount", "maxAttempts", "runId", "planId", "createdAt", "updatedAt"
            )
            VALUES (%s, %s, %s, %s, 'PENDING'::"TaskStatus", %s, %s::jsonb, 0, 3, %s, %s, %s, %s)
            RETURNING id, title, description, "assignedAgent", status, priority, input,
                      "runId", "planId", "createdAt", "updatedAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (task_id, title, description, assigned_agent, priority, input_json, run_id, plan_id, now, now),
                )
                return await cur.fetchone()

    async def update_task_status(
        self,
        task_id: str,
        status: str,
        output_data: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> bool:
        """Updates task execution status and output."""
        now = datetime.now(timezone.utc)
        output_json = json.dumps(output_data) if output_data is not None else None

        updates = ['status = %s::"TaskStatus"', '"updatedAt" = %s']
        params = [status, now]

        if output_data is not None:
            updates.append("output = %s::jsonb")
            params.append(output_json)

        if status == "RUNNING":
            updates.append('"startedAt" = COALESCE("startedAt", %s)')
            updates.append('"attemptCount" = "attemptCount" + 1')
            params.append(now)
        elif status in ("COMPLETED", "FAILED", "CANCELLED"):
            updates.append('"completedAt" = %s')
            params.append(now)

        params.append(task_id)
        query = f'UPDATE "ResearchTask" SET {", ".join(updates)} WHERE id = %s'

        async with db.get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, params)
                return cur.rowcount > 0

    async def create_dependency(self, task_id: str, depends_on_id: str) -> None:
        """Records a task dependency."""
        dep_id = generate_cuid("dep_")
        query = """
            INSERT INTO "ResearchTaskDependency" (id, "taskId", "dependsOnId")
            VALUES (%s, %s, %s)
            ON CONFLICT ("taskId", "dependsOnId") DO NOTHING
        """
        async with db.get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, (dep_id, task_id, depends_on_id))

    async def get_tasks_for_run(self, run_id: str) -> List[Dict[str, Any]]:
        """Fetches all tasks for a run."""
        query = """
            SELECT id, title, description, "assignedAgent", status, priority,
                   input, output, "attemptCount", "startedAt", "completedAt",
                   "runId", "planId", "createdAt", "updatedAt"
            FROM "ResearchTask"
            WHERE "runId" = %s
            ORDER BY priority ASC, "createdAt" ASC
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (run_id,))
                return await cur.fetchall()


task_repository = TaskRepository()


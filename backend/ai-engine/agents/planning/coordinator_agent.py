"""ResearchForge AI Engine - Research Coordinator Agent.

Manages task decomposition, task dependency resolution, agent assignment,
and research iteration loops.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from database.repositories import task_repository, event_repository
from utils.logger import logger


class TaskExecutionBatch(BaseModel):
    batch_index: int = Field(default=0, description="Execution wave index")
    ready_tasks: List[Dict[str, Any]] = Field(default_factory=list, description="Tasks whose dependencies are met")
    blocked_tasks: List[Dict[str, Any]] = Field(default_factory=list, description="Tasks waiting for prior dependencies")
    all_completed: bool = Field(default=False, description="Whether all planned tasks are completed")


class ResearchCoordinatorAgent:
    """Coordinates task execution waves and agent task assignments."""

    async def initialize_tasks(
        self,
        run_id: str,
        plan_id: Optional[str],
        tasks: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Persists the planned tasks and their dependencies into Neon PostgreSQL."""
        logger.info(f"[CoordinatorAgent] Initializing {len(tasks)} tasks for run {run_id}")
        created_tasks = []
        task_id_map: Dict[str, str] = {}  # maps plan task ID (e.g. 'task_1') to database cuid

        for idx, t in enumerate(tasks, start=1):
            title = t.get("title", f"Research Task {idx}")
            desc = t.get("description", "")
            tool = t.get("tool_required", "web_search")
            priority = t.get("priority", idx)

            db_task = await task_repository.create_task(
                run_id=run_id,
                title=title,
                description=desc,
                assigned_agent=tool,
                priority=priority,
                plan_id=plan_id,
                input_data={"plan_task_id": t.get("id", f"task_{idx}"), "expected_output": t.get("expected_output", "")},
            )
            original_id = t.get("id", f"task_{idx}")
            task_id_map[original_id] = db_task["id"]
            db_task["plan_task_id"] = original_id
            db_task["depends_on"] = t.get("depends_on", [])
            db_task["tool_required"] = tool
            created_tasks.append(db_task)

        # Wire task dependencies in database
        for t in tasks:
            orig_id = t.get("id")
            db_id = task_id_map.get(orig_id)
            if not db_id:
                continue
            for dep_orig_id in t.get("depends_on", []):
                dep_db_id = task_id_map.get(dep_orig_id)
                if dep_db_id:
                    await task_repository.create_dependency(task_id=db_id, depends_on_id=dep_db_id)

        await event_repository.create_event(
            run_id=run_id,
            event_type="TASKS_INITIALIZED",
            message=f"Initialized {len(created_tasks)} research tasks with dependency graph",
            agent_name="CoordinatorAgent",
            payload={"task_count": len(created_tasks)},
        )

        return created_tasks

    def schedule_next_batch(
        self,
        tasks: List[Dict[str, Any]],
        completed_task_ids: set,
    ) -> TaskExecutionBatch:
        """Determines which tasks are unblocked and ready for execution."""
        ready = []
        blocked = []

        for t in tasks:
            tid = t.get("plan_task_id") or t.get("id")
            if tid in completed_task_ids:
                continue

            deps = t.get("depends_on", [])
            if all(dep in completed_task_ids for dep in deps):
                ready.append(t)
            else:
                blocked.append(t)

        all_done = (len(ready) == 0 and len(blocked) == 0)
        return TaskExecutionBatch(
            ready_tasks=ready,
            blocked_tasks=blocked,
            all_completed=all_done,
        )


coordinator_agent = ResearchCoordinatorAgent()


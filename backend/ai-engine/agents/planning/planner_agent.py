"""ResearchForge AI Engine - Research Planning Agent.

Deconstructs research specifications into structured research dimensions,
sub-questions, and prioritized parallel tasks with tool requirements and dependencies.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from services.llm_service import llm_service
from schemas.llm import ModelRole
from database.repositories import run_repository, event_repository
from utils.logger import logger


class TaskPlanItem(BaseModel):
    id: str = Field(description="Unique task identifier like task_1, task_2")
    title: str = Field(description="Short action-oriented title")
    description: str = Field(description="Detailed research action to execute")
    tool_required: str = Field(description="Preferred capability/tool (e.g., web_search, semantic_search, scrape_url, code_search)")
    depends_on: List[str] = Field(default_factory=list, description="IDs of tasks this task depends on")
    expected_output: str = Field(description="Expected factual deliverable")


class ResearchPlanOutput(BaseModel):
    summary: str = Field(description="Strategic executive summary of the research roadmap")
    dimensions: List[str] = Field(description="Key perspectives or thematic dimensions to examine")
    sub_questions: List[str] = Field(description="Core sub-questions that must be answered")
    tasks: List[TaskPlanItem] = Field(description="Ordered list of research tasks")
    search_queries: List[str] = Field(description="Recommended search query strings")


class ResearchPlanningAgent:
    """Agent that creates structured, verifiable research plans."""

    async def run(
        self,
        run_id: str,
        query: str,
        specification: Dict[str, Any],
        auto_approve: bool = True,
    ) -> ResearchPlanOutput:
        """Generates a multi-step research plan and persists it in the database."""
        logger.info(f"[PlannerAgent] Planning research for run {run_id}")

        prompt = f"""
You are the Research Planning Agent for ResearchForge.
Create an empirical, multi-source research plan to thoroughly investigate the following objective.

User Query:
"{query}"

Research Specification:
- Domain: {specification.get('domain', 'General')}
- Scope: {specification.get('scope', 'Standard')}
- Depth: {specification.get('depth', 'in-depth')}
- Constraints: {specification.get('constraints', [])}

Instructions:
1. Break down the research into 3-5 distinct thematic dimensions.
2. Formulate 3-6 precise, verifiable sub-questions.
3. Design 3-6 concrete tasks. Each task must specify the tool capability (e.g. web_search, semantic_search, scrape_url, search_repositories).
4. Specify dependencies between tasks (tasks with no dependencies can run in parallel).
5. Suggest 4-8 high-yield search queries.
"""
        result = await llm_service.ainvoke_structured(
            messages=prompt,
            schema=ResearchPlanOutput,
            role=ModelRole.PRIMARY,  # Primary reasoning model for planning
            temperature=0.2,
        )
        plan_output = result.parsed

        # Persist plan in Neon PostgreSQL
        status = "APPROVED" if auto_approve else "PENDING_APPROVAL"
        saved_plan = await run_repository.create_or_update_plan(
            run_id=run_id,
            objective=query,
            content=plan_output.model_dump(),
            status=status,
        )

        # Emit audit event
        await event_repository.create_event(
            run_id=run_id,
            event_type="PLAN_CREATED",
            message=f"Research plan created with {len(plan_output.tasks)} tasks. Status: {status}",
            agent_name="PlanningAgent",
            payload={"plan_id": saved_plan["id"], "status": status, "task_count": len(plan_output.tasks)},
        )

        logger.info(f"[PlannerAgent] Plan {saved_plan['id']} created for run {run_id} ({status})")
        return plan_output


# Global planner agent instance
planner_agent = ResearchPlanningAgent()


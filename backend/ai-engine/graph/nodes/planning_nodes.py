"""ResearchForge AI Engine - Planning Graph Nodes.

LangGraph node functions for Intake, Planning, and Coordinator agents.
"""

from typing import Dict, Any
from graph.state.state import ResearchState
from agents.planning import intake_agent, planner_agent, coordinator_agent
from utils.logger import logger


async def intake_node(state: ResearchState) -> Dict[str, Any]:
    """LangGraph node: Analyzes user query and extracts research specification."""
    query = state.get("research_query", "")
    logger.info(f"[GraphNode:Intake] Processing query: '{query[:60]}'")

    spec = await intake_agent.run(query)

    return {
        "research_specification": spec.model_dump(),
        "search_queries": spec.search_keywords,
        "current_phase": "PLANNING",
        "current_status": "SPECIFIED",
        "active_agents": ["IntakeAgent"],
    }


async def planner_node(state: ResearchState) -> Dict[str, Any]:
    """LangGraph node: Deconstructs specification into tasks and dependencies."""
    run_id = state.get("run_id", "default_run")
    query = state.get("research_query", "")
    spec = state.get("research_specification", {})
    requires_approval = state.get("requires_approval", False)

    logger.info(f"[GraphNode:Planner] Generating plan for run {run_id}")
    plan_output = await planner_agent.run(
        run_id=run_id,
        query=query,
        specification=spec,
        auto_approve=not requires_approval,
    )

    plan_dict = plan_output.model_dump()
    tasks_list = plan_dict.get("tasks", [])

    return {
        "research_plan": plan_dict,
        "tasks": tasks_list,
        "search_queries": plan_output.search_queries,
        "plan_approved": not requires_approval,
        "current_phase": "TASK_DECOMPOSITION",
        "current_status": "PLAN_GENERATED",
        "active_agents": ["PlanningAgent"],
    }


async def plan_approval_gate_node(state: ResearchState) -> Dict[str, Any]:
    """LangGraph node: Human approval gate using LangGraph interrupt()."""
    from langgraph.types import interrupt
    from database.repositories import run_repository, event_repository

    run_id = state.get("run_id", "default_run")
    plan = state.get("research_plan", {})

    logger.info(f"[GraphNode:ApprovalGate] Pausing for plan approval on run {run_id}")
    await run_repository.update_status(run_id=run_id, status="PAUSED")
    await event_repository.create_event(
        run_id=run_id,
        event_type="WAITING_FOR_PLAN_APPROVAL",
        message="Research plan generated. Pausing execution awaiting human approval.",
        agent_name="ApprovalGate",
        payload={"plan": plan},
    )

    # Interrupt execution and wait for human decision
    decision = interrupt({
        "type": "PLAN_APPROVAL_REQUIRED",
        "run_id": run_id,
        "plan": plan,
    })

    approved = True
    if isinstance(decision, dict):
        approved = decision.get("approved", True)

    logger.info(f"[GraphNode:ApprovalGate] Resumed with approval decision: {approved}")
    await run_repository.update_status(run_id=run_id, status="RUNNING")

    return {
        "plan_approved": approved,
        "current_status": "PLAN_APPROVED" if approved else "PLAN_REJECTED",
    }


async def coordinator_node(state: ResearchState) -> Dict[str, Any]:
    """LangGraph node: Initializes database tasks, resolves dependencies, coordinates batch."""
    run_id = state.get("run_id", "default_run")
    plan = state.get("research_plan", {})
    plan_id = plan.get("id")
    tasks = state.get("tasks", [])

    logger.info(f"[GraphNode:Coordinator] Scheduling execution for run {run_id}")
    initialized_tasks = await coordinator_agent.initialize_tasks(
        run_id=run_id,
        plan_id=plan_id,
        tasks=tasks,
    )

    return {
        "tasks": initialized_tasks,
        "current_phase": "DISCOVERY",
        "current_status": "TASKS_SCHEDULED",
        "active_agents": ["CoordinatorAgent"],
        "research_iterations": state.get("research_iterations", 0) + 1,
    }

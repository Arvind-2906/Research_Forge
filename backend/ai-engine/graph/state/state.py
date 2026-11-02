"""ResearchForge AI Engine - Centralized LangGraph State Definition.

Typed state schema coordinating all agents throughout the research lifecycle.
Uses operator.add reducers for concurrency-safe parallel node branch updates.
"""

import operator
from typing import TypedDict, Annotated, Optional, Dict, Any, List


class ResearchState(TypedDict, total=False):
    """Central state passed across all LangGraph nodes."""

    # Context identifiers
    run_id: str
    user_id: Optional[str]
    workspace_id: Optional[str]
    project_id: Optional[str]

    # Core user query and specification
    research_query: str
    research_specification: Optional[Dict[str, Any]]

    # Plan and tasks
    research_plan: Optional[Dict[str, Any]]
    tasks: List[Dict[str, Any]]
    task_dependencies: Dict[str, Any]
    plan_approved: bool
    requires_approval: bool

    # Agent coordination
    active_agents: List[str]
    agent_results: Dict[str, Any]
    current_phase: str
    current_status: str

    # Information gathering (accumulated via operator.add reducer)
    search_queries: Annotated[List[str], operator.add]
    discovered_sources: Annotated[List[Dict[str, Any]], operator.add]
    extracted_sources: Annotated[List[Dict[str, Any]], operator.add]
    source_chunks: Annotated[List[Dict[str, Any]], operator.add]

    # Evidence and verification (accumulated via operator.add reducer)
    claims: Annotated[List[Dict[str, Any]], operator.add]
    evidence: Annotated[List[Dict[str, Any]], operator.add]
    verification_results: List[Dict[str, Any]]
    contradictions: List[Dict[str, Any]]
    research_gaps: List[str]

    # Control loops and budget limits
    research_iterations: int
    max_iterations: int
    is_paused: bool
    is_cancelled: bool

    # Synthesis, citation validation, and reporting
    synthesis: Optional[Dict[str, Any]]
    citations: List[Dict[str, Any]]
    report: Optional[Dict[str, Any]]
    quality_review: Optional[Dict[str, Any]]

    # Diagnostics and errors
    errors: Annotated[List[str], operator.add]
    execution_metadata: Dict[str, Any]


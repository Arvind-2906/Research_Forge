"""ResearchForge LangGraph Workflow Builder.

Orchestrates multi-agent research workflow nodes, edges, state transitions,
and compiles the executable LangGraph state machine.
"""

from typing import Optional, Any
from langgraph.graph.state import CompiledStateGraph
from graph.workflows.research_workflow import create_research_workflow
from utils.logger import logger


class GraphBuilder:
    """Builds and compiles the multi-agent research LangGraph workflow."""

    def __init__(self):
        self._workflow = create_research_workflow()

    def build(self, checkpointer: Optional[Any] = None) -> CompiledStateGraph:
        """Constructs and returns the compiled LangGraph workflow with optional checkpointer."""
        logger.info(f"[GraphBuilder] Compiling LangGraph workflow (checkpointer: {type(checkpointer).__name__ if checkpointer else 'None'})")
        if checkpointer is not None:
            return self._workflow.compile(checkpointer=checkpointer)
        return self._workflow.compile()


# Global graph builder instance
graph_builder = GraphBuilder()

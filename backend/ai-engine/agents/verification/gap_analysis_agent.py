"""ResearchForge AI Engine - Research Gap Analysis Agent.

Assesses research completeness against the original objective, identifies
information voids, and decides whether an additional targeted research iteration is warranted.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from services.llm_service import llm_service
from schemas.llm import ModelRole
from database.repositories import event_repository
from utils.logger import logger


class GapAnalysisLLMOutput(BaseModel):
    objective_satisfied: bool = Field(description="True if the primary research questions are adequately answered")
    confidence_level: float = Field(description="Overall completeness confidence score from 0.0 to 1.0")
    identified_gaps: List[str] = Field(default_factory=list, description="Specific sub-questions or topics with insufficient evidence")
    recommended_search_queries: List[str] = Field(default_factory=list, description="Targeted queries to address missing information")


class GapAnalysisOutput(BaseModel):
    needs_more_research: bool
    current_iteration: int
    max_iterations: int
    identified_gaps: List[str]
    follow_up_queries: List[str]


class ResearchGapAnalysisAgent:
    """Agent that identifies empirical gaps and controls the research loop."""

    async def run(
        self,
        run_id: str,
        research_query: str,
        dimensions: List[str],
        verified_claims: List[Dict[str, Any]],
        current_iteration: int = 1,
        max_iterations: int = 2,
    ) -> GapAnalysisOutput:
        """Determines if the research is complete or requires another loop."""
        logger.info(f"[GapAnalysisAgent] Analyzing gaps for run {run_id} (iteration {current_iteration}/{max_iterations})")

        # Hard stop if we reached max iterations
        if current_iteration >= max_iterations:
            logger.info(f"[GapAnalysisAgent] Max iterations ({max_iterations}) reached. Proceeding to synthesis.")
            return GapAnalysisOutput(
                needs_more_research=False,
                current_iteration=current_iteration,
                max_iterations=max_iterations,
                identified_gaps=[],
                follow_up_queries=[],
            )

        claims_summary = [c.get("claim_text") or c.get("claim", "") for c in verified_claims[:15]]

        prompt = f"""
You are the Research Gap Analysis Agent for ResearchForge.
Evaluate whether the verified evidence collected so far sufficiently answers the research question across all target dimensions.

Research Question:
"{research_query}"

Target Dimensions:
{dimensions}

Verified Claims Collected:
{claims_summary}

Determine:
1. Is the objective satisfactorily answered with strong evidence?
2. If NOT, identify up to 2 critical missing information gaps and suggest 2-3 precise search queries to fill them.
"""
        result = await llm_service.ainvoke_structured(
            messages=prompt,
            schema=GapAnalysisLLMOutput,
            role=ModelRole.LIGHTWEIGHT,
            temperature=0.1,
        )

        needs_more = (
            not result.parsed.objective_satisfied
            and len(result.parsed.identified_gaps) > 0
            and current_iteration < max_iterations
        )

        await event_repository.create_event(
            run_id=run_id,
            event_type="GAP_ANALYSIS_COMPLETED",
            message=f"Gap analysis completed. Needs more research: {needs_more} (iteration {current_iteration}/{max_iterations})",
            agent_name="GapAnalysisAgent",
            payload={
                "needs_more": needs_more,
                "iteration": current_iteration,
                "gaps": result.parsed.identified_gaps,
                "queries": result.parsed.recommended_search_queries,
            },
        )

        return GapAnalysisOutput(
            needs_more_research=needs_more,
            current_iteration=current_iteration,
            max_iterations=max_iterations,
            identified_gaps=result.parsed.identified_gaps,
            follow_up_queries=result.parsed.recommended_search_queries if needs_more else [],
        )


gap_analysis_agent = ResearchGapAnalysisAgent()


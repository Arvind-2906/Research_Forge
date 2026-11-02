"""ResearchForge AI Engine - Quality Review Agent.

Conducts automated peer-review of generated reports, evaluating objective fulfillment,
citation density, neutrality, coherence, and providing a calibrated quality score (0-100).
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from services.llm_service import llm_service
from schemas.llm import ModelRole
from database.repositories import event_repository
from utils.logger import logger


class QualityReviewLLMOutput(BaseModel):
    objective_fulfilled: bool = Field(description="Whether the report answers the core research query")
    quality_score: int = Field(description="Overall quality score from 0 to 100")
    strengths: List[str] = Field(description="Notable strengths of the report")
    weaknesses: List[str] = Field(default_factory=list, description="Areas where report is weak or could be improved")
    passed: bool = Field(description="True if quality_score >= 70 and objective is met")
    recommendation: str = Field(description="One of: 'APPROVE', 'APPROVE_WITH_RESERVATIONS', 'REVISE'")


class QualityReviewOutput(BaseModel):
    passed: bool
    score: int
    recommendation: str
    strengths: List[str]
    weaknesses: List[str]


class QualityReviewAgent:
    """Agent that performs quality assurance on research deliverables."""

    async def run(
        self,
        run_id: str,
        research_query: str,
        report_markdown: str,
        citation_count: int,
    ) -> QualityReviewOutput:
        """Evaluates report quality and records audit findings."""
        logger.info(f"[QualityReviewAgent] Reviewing report for run {run_id}")

        prompt = f"""
You are the Quality Review Agent for ResearchForge.
Critique the research report below according to these criteria:
1. Objective fulfillment: Does it directly and thoroughly answer the user's research question?
2. Empirical backing: Does it cite sources and reference evidence?
3. Neutrality & objectivity: Are contradictions or nuances acknowledged?
4. Coherence & professional structure: Is the flow logical and clear?

Research Question:
"{research_query}"

Citations Count: {citation_count}

Report Content Excerpt:
{report_markdown[:6000]}

Score the report from 0 to 100. Pass threshold is 70.
"""
        result = await llm_service.ainvoke_structured(
            messages=prompt,
            schema=QualityReviewLLMOutput,
            role=ModelRole.LIGHTWEIGHT,
            temperature=0.0,
        )

        passed = result.parsed.passed or result.parsed.quality_score >= 70

        await event_repository.create_event(
            run_id=run_id,
            event_type="QUALITY_REVIEW_COMPLETED",
            message=f"Quality review completed. Score: {result.parsed.quality_score}/100. Status: {'PASS' if passed else 'FAIL'}",
            agent_name="QualityReviewAgent",
            payload={
                "score": result.parsed.quality_score,
                "passed": passed,
                "recommendation": result.parsed.recommendation,
                "strengths": result.parsed.strengths,
                "weaknesses": result.parsed.weaknesses,
            },
        )

        return QualityReviewOutput(
            passed=passed,
            score=result.parsed.quality_score,
            recommendation=result.parsed.recommendation,
            strengths=result.parsed.strengths,
            weaknesses=result.parsed.weaknesses,
        )


quality_review_agent = QualityReviewAgent()


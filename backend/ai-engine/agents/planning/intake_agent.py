"""ResearchForge AI Engine - Research Intake Agent.

Analyzes the user's research query, determines domain, intent, scope, depth,
constraints, and produces a structured research specification.
"""

from typing import List, Optional
from pydantic import BaseModel, Field

from services.llm_service import llm_service
from schemas.llm import ModelRole
from utils.logger import logger


class ResearchSpecification(BaseModel):
    objective: str = Field(description="Clear, distilled core research objective")
    topic: str = Field(description="Primary topic or subject matter")
    domain: str = Field(description="Field or domain (e.g., Computer Science, Medicine, Economics)")
    scope: str = Field(description="Boundaries and scope of the research")
    depth: str = Field(description="Required depth: 'overview', 'in-depth', or 'exhaustive'")
    expected_format: str = Field(description="Format recommendation (e.g., structured technical report)")
    constraints: List[str] = Field(default_factory=list, description="Explicit or implicit constraints")
    search_keywords: List[str] = Field(default_factory=list, description="Initial high-yield search terms")


class ResearchIntakeAgent:
    """Agent responsible for understanding and specifying research requests."""

    async def run(self, query: str) -> ResearchSpecification:
        """Processes the research query into a structured ResearchSpecification."""
        logger.info(f"[IntakeAgent] Analyzing research query: '{query[:60]}'")

        prompt = f"""
You are the Research Intake Agent for ResearchForge.
Analyze the following user research query and extract a rigorous research specification.

User Query:
"{query}"

Generate a structured specification identifying the core objective, domain, scope boundaries,
appropriate depth, constraints, and 3-5 initial high-yield search keywords.
"""
        result = await llm_service.ainvoke_structured(
            messages=prompt,
            schema=ResearchSpecification,
            role=ModelRole.LIGHTWEIGHT,
            temperature=0.1,
        )
        logger.info(f"[IntakeAgent] Specification generated for topic '{result.parsed.topic}' (domain: {result.parsed.domain})")
        return result.parsed


# Global intake agent instance
intake_agent = ResearchIntakeAgent()


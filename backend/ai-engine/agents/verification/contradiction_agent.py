"""ResearchForge AI Engine - Contradiction Detection Agent.

Identifies conflicting findings, conflicting statistics, divergent timelines,
and opposing viewpoints across sources to ensure empirical neutrality.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from services.llm_service import llm_service
from schemas.llm import ModelRole
from database.repositories import event_repository
from utils.logger import logger


class ContradictionItem(BaseModel):
    topic: str = Field(description="The specific subject matter or metric of dispute")
    claim_a: str = Field(description="First claim or finding")
    source_a: str = Field(description="Source or reference supporting claim A")
    claim_b: str = Field(description="Conflicting claim or finding")
    source_b: str = Field(description="Source or reference supporting claim B")
    nature_of_conflict: str = Field(description="Explanation of the discrepancy (e.g. conflicting dates, differing methodologies, genuine scientific disagreement)")
    severity: str = Field(default="MEDIUM", description="'LOW', 'MEDIUM', or 'HIGH'")


class ContradictionLLMOutput(BaseModel):
    contradictions_found: bool = Field(description="True if substantive contradictions or conflicts exist")
    items: List[ContradictionItem] = Field(default_factory=list, description="List of detected contradictions")


class ContradictionOutput(BaseModel):
    has_contradictions: bool
    total_contradictions: int
    items: List[ContradictionItem]


class ContradictionAgent:
    """Agent that cross-examines claims across disparate sources to detect contradictions."""

    async def run(
        self,
        run_id: str,
        claims: List[Dict[str, Any]],
    ) -> ContradictionOutput:
        """Detects contradictions among extracted claims."""
        logger.info(f"[ContradictionAgent] Scanning {len(claims)} claims for contradictions in run {run_id}")

        if len(claims) < 2:
            return ContradictionOutput(has_contradictions=False, total_contradictions=0, items=[])

        claims_summary = []
        for idx, c in enumerate(claims[:12], 1):
            text = c.get("claim_text") or c.get("claim", "")
            src = c.get("source_url") or c.get("source", "unknown")
            claims_summary.append(f"Claim [{idx}]: \"{text}\" (Source: {src})")

        prompt = f"""
You are the Contradiction Detection Agent for ResearchForge.
Analyze the following claims extracted from different research sources.
Identify any factual contradictions, conflicting statistics, divergent dates, or directly opposing viewpoints.

Claims:
{"\n".join(claims_summary)}

Guidelines:
- Only flag substantive discrepancies (e.g., conflicting numbers, opposite factual assertions, irreconcilable conclusions).
- Do not flag complementary claims that simply cover different aspects.
"""
        result = await llm_service.ainvoke_structured(
            messages=prompt,
            schema=ContradictionLLMOutput,
            role=ModelRole.LIGHTWEIGHT,
            temperature=0.0,
        )

        items = result.parsed.items if result.parsed.contradictions_found else []

        if items:
            await event_repository.create_event(
                run_id=run_id,
                event_type="CONTRADICTION_DETECTED",
                message=f"Detected {len(items)} factual contradictions between sources",
                agent_name="ContradictionAgent",
                severity="WARN",
                payload={"contradictions": [item.model_dump() for item in items]},
            )

        return ContradictionOutput(
            has_contradictions=len(items) > 0,
            total_contradictions=len(items),
            items=items,
        )


contradiction_agent = ContradictionAgent()


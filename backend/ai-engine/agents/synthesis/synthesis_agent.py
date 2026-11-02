"""ResearchForge AI Engine - Research Synthesis Agent.

Synthesizes verified empirical claims into cohesive, structured thematic sections
with explicit evidence attribution.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from services.llm_service import llm_service
from schemas.llm import ModelRole
from database.repositories import event_repository
from utils.logger import logger


class SynthesisSection(BaseModel):
    title: str = Field(description="Thematic section heading")
    content: str = Field(description="Synthesized analytical text with inline evidence citations (e.g. [Evidence: ev_123])")
    key_findings: List[str] = Field(description="Bullet points of concrete findings in this section")
    cited_evidence_ids: List[str] = Field(default_factory=list, description="IDs of evidence referenced in this section")


class ResearchSynthesisOutput(BaseModel):
    executive_summary: str = Field(description="Comprehensive synthesis executive summary")
    sections: List[SynthesisSection] = Field(description="Thematic analytical sections")
    synthesis_narrative: str = Field(description="Full synthesized body text")


class ResearchSynthesisAgent:
    """Agent that integrates verified empirical evidence into structured insights."""

    async def run(
        self,
        run_id: str,
        research_query: str,
        dimensions: List[str],
        verified_claims: List[Dict[str, Any]],
        contradictions: Optional[List[Dict[str, Any]]] = None,
    ) -> ResearchSynthesisOutput:
        """Synthesizes verified findings into thematic sections."""
        logger.info(f"[SynthesisAgent] Synthesizing {len(verified_claims)} verified claims for run {run_id}")

        claims_context = []
        for idx, c in enumerate(verified_claims[:20], 1):
            cid = c.get("claim_id") or f"c_{idx}"
            eid = c.get("evidence_id") or f"ev_{idx}"
            text = c.get("claim_text") or c.get("claim", "")
            quote = c.get("quote", "")
            url = c.get("source_url", "")
            claims_context.append(f"- [Claim ID: {cid} | Evidence ID: {eid}]: {text}\n  Quote: \"{quote}\" (Source: {url})")

        contradictions_context = ""
        if contradictions:
            contradictions_context = "\nNoted Contradictions:\n" + "\n".join(
                [f"- {item.get('topic')}: {item.get('nature_of_conflict')}" for item in contradictions[:5]]
            )

        prompt = f"""
You are the Research Synthesis Agent for ResearchForge.
Synthesize the verified evidence below into a coherent, highly rigorous research narrative answering the question:
"{research_query}"

Research Dimensions:
{dimensions}

Verified Claims & Evidence:
{"\n".join(claims_context)}
{contradictions_context}

Instructions:
1. Write a clear Executive Summary distilling the bottom-line findings.
2. Group the findings into 2-4 thematic sections aligned with the research dimensions.
3. For EVERY substantive assertion, cite the supporting Evidence ID using the format `[Evidence: <eid>]`.
4. Address any contradictions or nuances neutrally without taking unwarranted speculative leaps.
"""
        result = await llm_service.ainvoke_structured(
            messages=prompt,
            schema=ResearchSynthesisOutput,
            role=ModelRole.PRIMARY,  # Primary reasoning model for high quality synthesis
            temperature=0.2,
        )

        await event_repository.create_event(
            run_id=run_id,
            event_type="SYNTHESIS_COMPLETED",
            message=f"Synthesized research into {len(result.parsed.sections)} sections",
            agent_name="SynthesisAgent",
            payload={"section_count": len(result.parsed.sections)},
        )

        return result.parsed


synthesis_agent = ResearchSynthesisAgent()


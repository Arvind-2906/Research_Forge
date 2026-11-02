"""ResearchForge AI Engine - Evidence Extraction Agent.

Extracts verifiable claims and supporting evidence excerpts from source texts,
linking them directly to snapshots and source provenance in Neon PostgreSQL.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from services.llm_service import llm_service
from schemas.llm import ModelRole
from database.repositories import claim_repository, event_repository
from utils.logger import logger


class RawClaimEvidenceItem(BaseModel):
    claim_text: str = Field(description="A concise, factual assertion made in the source")
    quote: str = Field(description="Verbatim or near-verbatim quote from the source supporting the claim")
    source_url: str = Field(description="Source URL where the claim originates")
    confidence: float = Field(default=0.8, description="Estimated confidence score between 0.0 and 1.0")


class EvidenceExtractionLLMOutput(BaseModel):
    items: List[RawClaimEvidenceItem] = Field(description="List of extracted claims with supporting quotes")


class ExtractedEvidenceResult(BaseModel):
    claim_id: str
    evidence_id: str
    claim_text: str
    quote: str
    source_url: str
    confidence: float


class EvidenceExtractionOutput(BaseModel):
    total_claims: int
    total_evidence: int
    items: List[ExtractedEvidenceResult]


class EvidenceExtractionAgent:
    """Agent that distills unstructured source text into structured claims and evidence."""

    async def run(
        self,
        run_id: str,
        sources: List[Dict[str, Any]],
        research_query: str,
    ) -> EvidenceExtractionOutput:
        """Extracts factual claims and quotes, saving them to Neon PostgreSQL."""
        logger.info(f"[EvidenceExtractionAgent] Extracting evidence from {len(sources)} sources for run {run_id}")

        if not sources:
            return EvidenceExtractionOutput(total_claims=0, total_evidence=0, items=[])

        # Prepare source snippets for LLM
        source_excerpts = []
        for idx, s in enumerate(sources[:6], 1):
            url = s.get("url", f"source_{idx}")
            title = s.get("title", "")
            content = s.get("content") or s.get("snippet", "")
            truncated = content[:2500].strip()
            source_excerpts.append(f"Source [{idx}] ({url}):\nTitle: {title}\nContent:\n{truncated}\n")

        prompt = f"""
You are the Evidence Extraction Agent for ResearchForge.
Your role is to extract distinct factual claims and direct supporting quotes from the provided sources that answer the research query.

Research Query:
"{research_query}"

Sources:
{"---".join(source_excerpts)}

Instructions:
1. Extract 3-8 key factual claims directly relevant to the research query.
2. For each claim, provide the verbatim supporting quote and the exact source URL.
3. Assign a confidence score (0.0 to 1.0) based on how directly the quote proves the claim.
4. Do not invent facts or claims not stated in the source text.
"""
        result = await llm_service.ainvoke_structured(
            messages=prompt,
            schema=EvidenceExtractionLLMOutput,
            role=ModelRole.LIGHTWEIGHT,
            temperature=0.1,
        )

        extracted_results: List[ExtractedEvidenceResult] = []

        # Persist in Neon PostgreSQL via claim_repository
        for item in result.parsed.items:
            try:
                # 1. Create claim
                claim = await claim_repository.create_claim(
                    run_id=run_id,
                    claim=item.claim_text,
                    confidence=item.confidence,
                    status="PENDING",
                )

                # 2. Find snapshot_id if available from sources
                snapshot_id = None
                for s in sources:
                    if s.get("url") == item.source_url:
                        snapshot_id = s.get("snapshot_id")
                        break

                # 3. Create evidence record
                evidence = await claim_repository.create_evidence(
                    run_id=run_id,
                    content=item.quote,
                    snapshot_id=snapshot_id,
                    quality_score=item.confidence,
                    confidence=item.confidence,
                )

                # 4. Link claim and evidence
                await claim_repository.link_claim_evidence(
                    claim_id=claim["id"],
                    evidence_id=evidence["id"],
                    relationship="SUPPORTS",
                    confidence=item.confidence,
                )

                extracted_results.append(
                    ExtractedEvidenceResult(
                        claim_id=claim["id"],
                        evidence_id=evidence["id"],
                        claim_text=item.claim_text,
                        quote=item.quote,
                        source_url=item.source_url,
                        confidence=item.confidence,
                    )
                )
            except Exception as e:
                logger.warning(f"[EvidenceExtractionAgent] Error persisting claim/evidence: {e}")

        await event_repository.create_event(
            run_id=run_id,
            event_type="EVIDENCE_EXTRACTED",
            message=f"Extracted {len(extracted_results)} factual claims and linked evidence",
            agent_name="EvidenceExtractionAgent",
            payload={"claims_count": len(extracted_results)},
        )

        return EvidenceExtractionOutput(
            total_claims=len(extracted_results),
            total_evidence=len(extracted_results),
            items=extracted_results,
        )


evidence_extraction_agent = EvidenceExtractionAgent()


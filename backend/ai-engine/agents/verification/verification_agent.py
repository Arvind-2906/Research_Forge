"""ResearchForge AI Engine - Verification Agent.

Rigorously verifies extracted claims against empirical evidence quotes,
evaluating grounding, accuracy, and assigning calibrated verification statuses.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from services.llm_service import llm_service
from schemas.llm import ModelRole
from database.repositories import claim_repository, event_repository
from utils.logger import logger


class ClaimVerificationItem(BaseModel):
    claim_id: str
    status: str = Field(description="One of: 'VERIFIED', 'PARTIALLY_VERIFIED', 'CONTRADICTED', 'UNVERIFIABLE'")
    confidence: float = Field(description="Calibrated confidence score between 0.0 and 1.0")
    explanation: str = Field(description="Reasoning explaining why the evidence supports or fails to support the claim")


class VerificationLLMOutput(BaseModel):
    verifications: List[ClaimVerificationItem] = Field(description="Evaluations for each analyzed claim")


class VerificationOutput(BaseModel):
    total_evaluated: int
    verified_count: int
    contradicted_count: int
    unverifiable_count: int
    evaluations: List[ClaimVerificationItem]


class VerificationAgent:
    """Agent that rigorously tests claims against empirical evidence quotes."""

    async def run(
        self,
        run_id: str,
        claims_with_evidence: List[Dict[str, Any]],
    ) -> VerificationOutput:
        """Evaluates claim truthfulness against evidence and updates Neon PostgreSQL."""
        logger.info(f"[VerificationAgent] Verifying {len(claims_with_evidence)} claims for run {run_id}")

        if not claims_with_evidence:
            return VerificationOutput(
                total_evaluated=0,
                verified_count=0,
                contradicted_count=0,
                unverifiable_count=0,
                evaluations=[],
            )

        pairs_text = []
        for idx, item in enumerate(claims_with_evidence, 1):
            claim_id = item.get("claim_id", f"claim_{idx}")
            claim_text = item.get("claim_text") or item.get("claim", "")
            quote = item.get("quote") or item.get("evidence", "")
            url = item.get("source_url", "unknown")
            pairs_text.append(
                f"Item [{idx}]:\nClaim ID: {claim_id}\nClaim: {claim_text}\nSupporting Quote: \"{quote}\"\nSource: {url}\n"
            )

        prompt = f"""
You are the Verification Agent for ResearchForge.
Examine each claim and its purported evidence quote with strict skepticism.

Guidelines:
- If the quote explicitly and unambiguously proves the claim, mark status as 'VERIFIED' (confidence 0.85 - 1.0).
- If the quote lends partial support or implies the claim without complete proof, mark 'PARTIALLY_VERIFIED' (confidence 0.5 - 0.84).
- If the quote actually disproves or directly conflicts with the claim, mark 'CONTRADICTED' (confidence 0.7 - 1.0).
- If the quote is unrelated, vague, or insufficient, mark 'UNVERIFIABLE' (confidence 0.0 - 0.49).

Claim & Evidence Pairs:
{"---".join(pairs_text)}
"""
        result = await llm_service.ainvoke_structured(
            messages=prompt,
            schema=VerificationLLMOutput,
            role=ModelRole.LIGHTWEIGHT,
            temperature=0.0,
        )

        verified = 0
        contradicted = 0
        unverifiable = 0

        for v in result.parsed.verifications:
            if v.status == "VERIFIED":
                verified += 1
            elif v.status == "CONTRADICTED":
                contradicted += 1
            elif v.status == "UNVERIFIABLE":
                unverifiable += 1

            # Update database status
            try:
                await claim_repository.update_claim_status(
                    claim_id=v.claim_id,
                    status=v.status,
                    confidence=v.confidence,
                    explanation=v.explanation,
                )
            except Exception as e:
                logger.warning(f"[VerificationAgent] Failed to update claim {v.claim_id}: {e}")

        await event_repository.create_event(
            run_id=run_id,
            event_type="CLAIMS_VERIFIED",
            message=f"Verified {len(result.parsed.verifications)} claims ({verified} verified, {contradicted} contradicted, {unverifiable} unverifiable)",
            agent_name="VerificationAgent",
            payload={"verified": verified, "contradicted": contradicted, "unverifiable": unverifiable},
        )

        return VerificationOutput(
            total_evaluated=len(result.parsed.verifications),
            verified_count=verified,
            contradicted_count=contradicted,
            unverifiable_count=unverifiable,
            evaluations=result.parsed.verifications,
        )


verification_agent = VerificationAgent()


"""Tests for LLM Service Abstraction & Structured Output.
"""

import sys
import asyncio
import pytest
from pydantic import BaseModel, Field

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from services.llm_service import llm_service
from schemas.llm import ModelRole, LLMResult, LLMStructuredResult


class ResearchSummarySchema(BaseModel):
    topic: str = Field(description="The main research topic")
    findings: list[str] = Field(description="Key bullet points")
    confidence_score: int = Field(description="Score between 1 and 10")


def test_model_name_resolution():
    """Verifies that model roles resolve to the configured Groq models."""
    primary = llm_service.resolve_model_name(ModelRole.PRIMARY)
    reasoning = llm_service.resolve_model_name("reasoning")
    lightweight = llm_service.resolve_model_name(ModelRole.LIGHTWEIGHT)
    extraction = llm_service.resolve_model_name("extraction")

    assert "120b" in primary
    assert primary == reasoning
    assert "20b" in lightweight
    assert lightweight == extraction


@pytest.mark.asyncio
async def test_llm_invocation_and_usage_tracking():
    """Verifies standard LLM invocation and token usage tracking."""
    result = await llm_service.ainvoke(
        messages="Respond with exactly two words: System Online",
        role=ModelRole.LIGHTWEIGHT,
        temperature=0.1,
    )

    assert isinstance(result, LLMResult)
    assert len(result.content.strip()) > 0
    assert result.usage.total_tokens > 0
    assert result.usage.prompt_tokens > 0
    assert result.latency_ms > 0
    assert result.model == llm_service.resolve_model_name(ModelRole.LIGHTWEIGHT)


@pytest.mark.asyncio
async def test_structured_output_parsing():
    """Verifies Pydantic structured output validation."""
    prompt = "Analyze quantum computing breakthroughs in 2 sentences and assign a confidence score of 8."
    result = await llm_service.ainvoke_structured(
        messages=prompt,
        schema=ResearchSummarySchema,
        role=ModelRole.LIGHTWEIGHT,
        temperature=0.1,
    )

    assert isinstance(result, LLMStructuredResult)
    assert isinstance(result.parsed, ResearchSummarySchema)
    assert len(result.parsed.topic) > 0
    assert len(result.parsed.findings) > 0
    assert 1 <= result.parsed.confidence_score <= 10
    assert result.usage.total_tokens > 0
    assert result.latency_ms > 0


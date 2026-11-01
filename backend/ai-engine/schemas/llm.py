"""ResearchForge AI Engine - LLM & Token Tracking Schemas.
"""

from typing import Generic, TypeVar, Optional, Any
from enum import Enum
from pydantic import BaseModel, Field


class ModelRole(str, Enum):
    PRIMARY = "primary"
    LIGHTWEIGHT = "lightweight"
    REASONING = "reasoning"
    EXTRACTION = "extraction"


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    reasoning_tokens: Optional[int] = None
    estimated_cost_usd: float = 0.0


class LLMResult(BaseModel):
    content: str
    model: str
    usage: TokenUsage
    latency_ms: float
    finish_reason: Optional[str] = None
    raw_response: Optional[Any] = None


T = TypeVar("T")


class LLMStructuredResult(BaseModel, Generic[T]):
    parsed: T
    model: str
    usage: TokenUsage
    latency_ms: float
    finish_reason: Optional[str] = None


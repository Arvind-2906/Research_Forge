"""ResearchForge AI Engine - Centralized LLM Service Abstraction.

Provides Groq-based LLM integration with model selection, token usage tracking,
structured output parsing, and error handling.
"""

import time
from typing import Type, TypeVar, Optional, Any, Union, List
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from config.settings import get_settings
from schemas.llm import ModelRole, TokenUsage, LLMResult, LLMStructuredResult
from utils.logger import logger

T = TypeVar("T")


class LLMServiceError(Exception):
    """Raised when an LLM call fails."""
    pass


class LLMService:
    """Centralized LLM service utilizing Groq with token tracking and structured output."""

    def __init__(self):
        self.settings = get_settings()

    def resolve_model_name(self, role: Union[ModelRole, str]) -> str:
        """Resolves the model name based on requested role or returns explicit model name."""
        if isinstance(role, ModelRole):
            role_val = role.value
        else:
            role_val = str(role).lower()

        if role_val in (ModelRole.PRIMARY.value, ModelRole.REASONING.value):
            return self.settings.PRIMARY_REASONING_MODEL
        elif role_val in (ModelRole.LIGHTWEIGHT.value, ModelRole.EXTRACTION.value):
            return self.settings.LIGHTWEIGHT_TASK_MODEL
        return role_val

    def get_client(
        self,
        role: Union[ModelRole, str] = ModelRole.PRIMARY,
        temperature: Optional[float] = None,
        max_retries: Optional[int] = None,
        timeout: Optional[float] = None,
    ) -> ChatGroq:
        """Returns a configured ChatGroq instance."""
        model_name = self.resolve_model_name(role)
        temp = temperature if temperature is not None else self.settings.DEFAULT_LLM_TEMPERATURE
        retries = max_retries if max_retries is not None else self.settings.DEFAULT_LLM_MAX_RETRIES
        req_timeout = timeout if timeout is not None else self.settings.DEFAULT_LLM_TIMEOUT

        return ChatGroq(
            model=model_name,
            api_key=self.settings.GROQ_API_KEY,
            temperature=temp,
            max_retries=retries,
            request_timeout=req_timeout,
        )

    def _extract_usage(self, response: Any, model_name: str) -> TokenUsage:
        """Extracts token usage and estimates costs from LangChain response."""
        usage_meta = getattr(response, "usage_metadata", None) or {}
        resp_meta = getattr(response, "response_metadata", None) or {}
        token_usage_dict = resp_meta.get("token_usage", {})

        prompt_tokens = usage_meta.get("input_tokens") or token_usage_dict.get("prompt_tokens", 0)
        completion_tokens = usage_meta.get("output_tokens") or token_usage_dict.get("completion_tokens", 0)
        total_tokens = usage_meta.get("total_tokens") or token_usage_dict.get("total_tokens", 0)

        details = usage_meta.get("output_token_details", {}) or {}
        reasoning_tokens = details.get("reasoning") or token_usage_dict.get("completion_tokens_details", {}).get("reasoning_tokens")

        rate_per_m = 0.59 if "120b" in model_name.lower() else 0.15
        cost = (total_tokens / 1_000_000.0) * rate_per_m

        return TokenUsage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            reasoning_tokens=reasoning_tokens,
            estimated_cost_usd=round(cost, 6),
        )

    def _format_messages(self, messages: Union[List[BaseMessage], List[dict], str]) -> List[BaseMessage]:
        """Normalizes input messages into a list of BaseMessage objects."""
        if isinstance(messages, str):
            return [HumanMessage(content=messages)]
        elif isinstance(messages, list):
            formatted: List[BaseMessage] = []
            for m in messages:
                if isinstance(m, BaseMessage):
                    formatted.append(m)
                elif isinstance(m, dict):
                    role = m.get("role", "user").lower()
                    content = m.get("content", "")
                    if role == "system":
                        formatted.append(SystemMessage(content=content))
                    else:
                        formatted.append(HumanMessage(content=content))
                else:
                    formatted.append(HumanMessage(content=str(m)))
            return formatted
        return [HumanMessage(content=str(messages))]

    async def ainvoke(
        self,
        messages: Union[List[BaseMessage], List[dict], str],
        role: Union[ModelRole, str] = ModelRole.PRIMARY,
        temperature: Optional[float] = None,
        max_retries: Optional[int] = None,
        timeout: Optional[float] = None,
    ) -> LLMResult:
        """Asynchronously invokes the LLM, tracks token usage, and measures latency."""
        model_name = self.resolve_model_name(role)
        client = self.get_client(role=model_name, temperature=temperature, max_retries=max_retries, timeout=timeout)
        formatted_msgs = self._format_messages(messages)

        start_time = time.perf_counter()
        try:
            response = await client.ainvoke(formatted_msgs)
            latency_ms = (time.perf_counter() - start_time) * 1000.0
            usage = self._extract_usage(response, model_name)

            content = response.content if isinstance(response.content, str) else str(response.content)
            finish_reason = getattr(response, "response_metadata", {}).get("finish_reason")

            logger.info(
                f"[LLM] Model: {model_name} | Latency: {latency_ms:.1f}ms | Tokens: {usage.total_tokens} (in: {usage.prompt_tokens}, out: {usage.completion_tokens})"
            )

            return LLMResult(
                content=content,
                model=model_name,
                usage=usage,
                latency_ms=round(latency_ms, 2),
                finish_reason=finish_reason,
                raw_response=response,
            )
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000.0
            logger.error(f"[LLM Error] Model: {model_name} | Latency: {latency_ms:.1f}ms | Error: {e}")
            raise LLMServiceError(f"LLM invocation failed: {e}") from e

    async def ainvoke_structured(
        self,
        messages: Union[List[BaseMessage], List[dict], str],
        schema: Type[T],
        role: Union[ModelRole, str] = ModelRole.PRIMARY,
        temperature: Optional[float] = None,
        max_retries: Optional[int] = None,
        timeout: Optional[float] = None,
    ) -> LLMStructuredResult[T]:
        """Asynchronously invokes the LLM with structured output parsing and schema validation."""
        model_name = self.resolve_model_name(role)
        client = self.get_client(role=model_name, temperature=temperature, max_retries=max_retries, timeout=timeout)

        # Inject system instruction requesting JSON conforming to the schema
        system_instruction = SystemMessage(
            content=f"You are a structured research assistant. Output valid JSON adhering to the {schema.__name__} schema."
        )
        formatted_msgs = [system_instruction] + self._format_messages(messages)

        start_time = time.perf_counter()
        try:
            structured_client = client.with_structured_output(schema, method="json_schema", include_raw=True)
            result = await structured_client.ainvoke(formatted_msgs)
            latency_ms = (time.perf_counter() - start_time) * 1000.0

            raw_resp = result.get("raw")
            parsed_data = result.get("parsed")
            parsing_error = result.get("parsing_error")

            if parsing_error or parsed_data is None:
                raise LLMServiceError(f"Failed to parse structured output into {schema.__name__}: {parsing_error}")

            usage = self._extract_usage(raw_resp, model_name)
            finish_reason = getattr(raw_resp, "response_metadata", {}).get("finish_reason")

            logger.info(
                f"[LLM Structured] Model: {model_name} | Schema: {schema.__name__} | Latency: {latency_ms:.1f}ms | Tokens: {usage.total_tokens}"
            )

            return LLMStructuredResult(
                parsed=parsed_data,
                model=model_name,
                usage=usage,
                latency_ms=round(latency_ms, 2),
                finish_reason=finish_reason,
            )
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000.0
            logger.error(f"[LLM Structured Error] Model: {model_name} | Schema: {schema.__name__} | Latency: {latency_ms:.1f}ms | Error: {e}")
            raise LLMServiceError(f"Structured LLM invocation failed: {e}") from e


# Global service instance
llm_service = LLMService()

"""Shared LLM client helpers for ms2 agents."""

import asyncio
import json
import os
from typing import Any

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from app.logger import logger


class LLMConfigurationError(RuntimeError):
    """Raised when LLM usage is requested but not configured."""


class LLMResponseError(RuntimeError):
    """Raised when an LLM response cannot be parsed safely."""


class LLMClient:
    """JSON-response helper supporting Groq (default if key present) and Anthropic.

    Agents should keep safety gates and calculations outside this class. This
    helper only asks the model for structured interpretation or language.
    """

    def __init__(self) -> None:
        self.enabled = os.getenv("USE_LLM", "true").lower() in {"1", "true", "yes"}
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self.model = os.getenv("LLM_MODEL", "claude-3-haiku-20240307")
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.temperature = float(os.getenv("LLM_TEMPERATURE", "0.2"))
        self.max_tokens = int(os.getenv("LLM_MAX_TOKENS", "1200"))
        self.timeout_seconds = float(os.getenv("LLM_TIMEOUT_SECONDS", "30"))
        self._client = None

    @property
    def available(self) -> bool:
        """Return whether runtime LLM calls can be made."""
        return self.enabled and (self._has_real_api_key() or self._has_real_groq_key())

    def _has_real_api_key(self) -> bool:
        if not self.api_key:
            return False
        return self.api_key.strip() not in {"", "your_anthropic_api_key_here"}

    def _has_real_groq_key(self) -> bool:
        if not self.groq_api_key:
            return False
        return self.groq_api_key.strip() not in {"", "your_groq_api_key_here"}

    def _get_client(self):
        if not self.available:
            raise LLMConfigurationError("Neither ANTHROPIC_API_KEY nor GROQ_API_KEY is configured")

        if self._client is None:
            try:
                from anthropic import Anthropic
            except ImportError as exc:
                raise LLMConfigurationError("anthropic package is not installed") from exc

            self._client = Anthropic(api_key=self.api_key)

        return self._client

    async def complete_json(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
        response_schema: dict[str, Any],
        operation: str,
    ) -> dict[str, Any]:
        """Request a JSON object and retry once if parsing fails."""
        if not self.available:
            raise LLMConfigurationError("LLM is disabled or missing configuration keys")

        base_user_content = json.dumps(
            {
                "task": operation,
                "input": user_payload,
                "response_schema": response_schema,
                "format_rules": [
                    "Return one JSON object only.",
                    "Do not include markdown fences.",
                    "Do not include explanatory prose outside the JSON object.",
                ],
            },
            indent=2,
            sort_keys=True,
        )

        last_error: Exception | None = None
        for attempt in range(2):
            user_content = base_user_content
            if attempt == 1:
                user_content += (
                    "\n\nYour previous response was not valid JSON matching the requested "
                    "shape. Return only a single corrected JSON object."
                )

            try:
                if self._has_real_groq_key():
                    raw_text = await self._create_message_groq(
                        system_prompt=system_prompt,
                        user_content=user_content,
                    )
                else:
                    raw_text = await asyncio.wait_for(
                        asyncio.to_thread(
                            self._create_message,
                            system_prompt=system_prompt,
                            user_content=user_content,
                        ),
                        timeout=self.timeout_seconds,
                    )
                return self._parse_json_object(raw_text)
            except Exception as exc:
                last_error = exc
                logger.warning("LLM JSON response failed", extra={
                    "operation": operation,
                    "attempt": attempt + 1,
                    "error": str(exc),
                })

        raise LLMResponseError(f"LLM failed to return valid JSON for {operation}") from last_error

    def _create_message(self, *, system_prompt: str, user_content: str) -> str:
        client = self._get_client()
        response = client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}],
        )

        parts = []
        for block in getattr(response, "content", []):
            text = getattr(block, "text", None)
            if text:
                parts.append(text)
        return "\n".join(parts).strip()

    async def _create_message_groq(self, *, system_prompt: str, user_content: str) -> str:
        import httpx
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.groq_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "response_format": {"type": "json_object"}
        }

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code != 200:
                logger.error("Groq API call failed", extra={
                    "status_code": response.status_code,
                    "response": response.text,
                })
                response.raise_for_status()

            data = response.json()
            return data["choices"][0]["message"]["content"]


    def _parse_json_object(self, text: str) -> dict[str, Any]:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:].strip()

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start == -1 or end == -1 or end <= start:
                raise
            parsed = json.loads(cleaned[start:end + 1])

        if not isinstance(parsed, dict):
            raise ValueError("LLM response must be a JSON object")

        return parsed


llm_client = LLMClient()



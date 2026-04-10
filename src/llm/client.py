from __future__ import annotations

import json
import random
import time
from dataclasses import dataclass
from typing import Protocol

import httpx


class LLMTransport(Protocol):
    def complete(self, prompt: str, timeout_seconds: float) -> str:
        """Return LLM text response."""


@dataclass(frozen=True)
class RetryPolicy:
    attempts: int = 3
    timeout_seconds: float = 10.0
    base_backoff_seconds: float = 0.25
    max_jitter_seconds: float = 0.35


class LLMClient:
    def __init__(self, transport: LLMTransport, retry_policy: RetryPolicy | None = None) -> None:
        self.transport = transport
        self.retry_policy = retry_policy or RetryPolicy()

    def complete_json(self, prompt: str) -> dict:
        last_error: Exception | None = None
        for attempt in range(1, self.retry_policy.attempts + 1):
            try:
                raw = self.transport.complete(prompt, self.retry_policy.timeout_seconds)
                payload = _extract_json(raw)
                if not isinstance(payload, dict):
                    raise ValueError("LLM response is not a JSON object")
                return payload
            except httpx.HTTPStatusError as exc:
                # API key / IAM expired or forbidden — retries only spam logs and delay fallback.
                if exc.response is not None and exc.response.status_code in (401, 403):
                    raise RuntimeError("LLM authentication failed (401/403)") from exc
                last_error = exc
                if attempt == self.retry_policy.attempts:
                    break
                backoff = self.retry_policy.base_backoff_seconds * (2 ** (attempt - 1))
                jitter = random.uniform(0.0, max(0.0, self.retry_policy.max_jitter_seconds))
                time.sleep(backoff + jitter)
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                if attempt == self.retry_policy.attempts:
                    break
                backoff = self.retry_policy.base_backoff_seconds * (2 ** (attempt - 1))
                jitter = random.uniform(0.0, max(0.0, self.retry_policy.max_jitter_seconds))
                time.sleep(backoff + jitter)
        raise RuntimeError(f"LLM request failed after retries: {last_error}") from last_error


def _extract_json(raw: str) -> dict | list:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 2:
            body = "\n".join(lines[1:])
            body = body.rstrip()
            if body.endswith("```"):
                body = body[: -3].rstrip()
            text = body
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            return json.loads(text[start : end + 1])
        raise

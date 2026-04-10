from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Protocol


class LLMTransport(Protocol):
    def complete(self, prompt: str, timeout_seconds: float) -> str:
        """Return LLM text response."""


@dataclass(frozen=True)
class RetryPolicy:
    attempts: int = 3
    timeout_seconds: float = 10.0
    base_backoff_seconds: float = 0.25


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
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                if attempt == self.retry_policy.attempts:
                    break
                time.sleep(self.retry_policy.base_backoff_seconds * attempt)
        raise RuntimeError(f"LLM request failed after retries: {last_error}") from last_error


class YandexGPTTransport:
    def __init__(
        self,
        api_key: str,
        folder_id: str,
        model_uri: str,
        endpoint: str = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
        temperature: float = 0.2,
        max_tokens: int = 800,
    ) -> None:
        self.api_key = api_key.strip()
        self.folder_id = folder_id.strip()
        self.model_uri = model_uri.strip()
        self.endpoint = endpoint.strip()
        self.temperature = float(temperature)
        self.max_tokens = int(max_tokens)
        if not self.api_key:
            raise ValueError("Yandex API key is empty")
        if not self.folder_id:
            raise ValueError("Yandex folder id is empty")
        if not self.model_uri:
            raise ValueError("Yandex model uri is empty")

    def complete(self, prompt: str, timeout_seconds: float) -> str:
        body = {
            "modelUri": self.model_uri,
            "completionOptions": {
                "stream": False,
                "temperature": self.temperature,
                "maxTokens": str(self.max_tokens),
            },
            "messages": [{"role": "user", "text": prompt}],
        }
        request = urllib.request.Request(
            self.endpoint,
            data=json.dumps(body, ensure_ascii=True).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Api-Key {self.api_key}",
                "x-folder-id": self.folder_id,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
                raw = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            details = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Yandex HTTP {exc.code}: {details}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Yandex request failed: {exc.reason}") from exc

        payload = json.loads(raw)
        alternatives = payload.get("result", {}).get("alternatives", [])
        if not alternatives:
            raise ValueError("Yandex response has no alternatives")
        message = alternatives[0].get("message", {})
        text = message.get("text")
        if not isinstance(text, str) or not text.strip():
            raise ValueError("Yandex response text is empty")
        return text


def build_client_from_env() -> LLMClient:
    api_key = os.getenv("YANDEX_API_KEY", "")
    folder_id = os.getenv("YANDEX_FOLDER_ID", "")
    model_uri = os.getenv("YANDEX_MODEL_URI", "")
    endpoint = os.getenv(
        "YANDEX_ENDPOINT",
        "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
    )
    retry_attempts = int(os.getenv("LLM_RETRY_ATTEMPTS", "3"))
    timeout_seconds = float(os.getenv("LLM_TIMEOUT_SECONDS", "15"))
    backoff_seconds = float(os.getenv("LLM_BACKOFF_SECONDS", "0.3"))

    transport = YandexGPTTransport(
        api_key=api_key,
        folder_id=folder_id,
        model_uri=model_uri,
        endpoint=endpoint,
    )
    return LLMClient(
        transport=transport,
        retry_policy=RetryPolicy(
            attempts=retry_attempts,
            timeout_seconds=timeout_seconds,
            base_backoff_seconds=backoff_seconds,
        ),
    )


def _extract_json(raw: str) -> dict | list:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 3:
            text = "\n".join(lines[1:-1]).strip()
    return json.loads(text)

from __future__ import annotations

import json

import httpx

from app.core.config import Settings
from app.core.provider_logging import log_provider_exchange


class YandexFoundationTransport:
    """Yandex Cloud Foundation Models completion (JSON-only prompts)."""

    def __init__(self, settings: Settings) -> None:
        self._url = settings.yandex_completion_url.strip()
        self._model_uri = settings.resolved_yandex_model_uri()
        self._api_key = settings.yandex_api_key.strip()
        self._iam = settings.yandex_iam_token.strip()
        self._temperature = settings.llm_temperature
        self._max_tokens = settings.llm_max_tokens

    def complete(self, prompt: str, timeout_seconds: float) -> str:
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Api-Key {self._api_key}"
        elif self._iam:
            headers["Authorization"] = f"Bearer {self._iam}"
        else:
            raise RuntimeError("Yandex credentials missing (set YANDEX_API_KEY or YANDEX_IAM_TOKEN)")

        body = {
            "modelUri": self._model_uri,
            "completionOptions": {
                "stream": False,
                "temperature": self._temperature,
                "maxTokens": int(self._max_tokens),
            },
            "messages": [
                {
                    "role": "system",
                    "text": "Отвечай только валидным JSON-объектом без пояснений и без markdown.",
                },
                {"role": "user", "text": prompt},
            ],
        }
        req_raw = json.dumps(body, ensure_ascii=True)
        with httpx.Client(timeout=timeout_seconds) as client:
            resp = client.post(self._url, headers=headers, content=req_raw)

        log_provider_exchange(
            provider="yandex",
            event="completion",
            status_code=resp.status_code,
            request_body=req_raw,
            response_body=resp.text,
        )

        resp.raise_for_status()
        data = resp.json()
        try:
            alts = data["result"]["alternatives"]
            text = alts[0]["message"]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ValueError(f"Unexpected Yandex response shape: {data!r}") from exc
        return str(text).strip()

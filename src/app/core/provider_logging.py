from __future__ import annotations

import logging
import re

logger = logging.getLogger("conce.providers")

# Log bodies as requested; strip obvious secret-bearing fields / values.
_SENSITIVE_KEY_RE = re.compile(r"(api_?key|secret|token|password|authorization|refresh_token|client_secret)", re.I)
_TOKEN_LIKE = re.compile(
    r'("(?:access_token|refresh_token|secret|Api-Key|Authorization)"\s*:\s*")([^"]+)(")',
    re.I,
)
_OAUTH_CODE = re.compile(r'("code"\s*:\s*")([^"]+)(")', re.I)


def redact_secrets_in_text(text: str, max_len: int = 16_384) -> str:
    if len(text) > max_len:
        text = text[:max_len] + "…[truncated]"
    text = _TOKEN_LIKE.sub(r"\1[REDACTED]\3", text)
    return _OAUTH_CODE.sub(r"\1[REDACTED]\3", text)


def log_provider_exchange(
    *,
    provider: str,
    event: str,
    request_body: str | None = None,
    response_body: str | None = None,
    status_code: int | None = None,
    extra: str | None = None,
) -> None:
    parts = [f"[{provider}] {event}"]
    if status_code is not None:
        parts.append(f"status={status_code}")
    if extra:
        parts.append(extra)
    msg = " ".join(parts)
    if request_body is not None:
        msg += f" | request_body={redact_secrets_in_text(request_body)}"
    if response_body is not None:
        msg += f" | response_body={redact_secrets_in_text(response_body)}"
    logger.warning(msg)


def log_provider_reason(provider: str, reason: str, detail: str | None = None) -> None:
    line = f"[{provider}] fallback_or_degraded reason={reason}"
    if detail:
        line += f" detail={detail}"
    logger.warning(line)

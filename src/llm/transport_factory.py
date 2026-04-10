from __future__ import annotations

from functools import lru_cache

from app.core.config import Settings
from app.core.provider_logging import log_provider_reason
from llm.client import LLMTransport
from llm.mock_transport import LLMMockTransport
from llm.yandex_transport import YandexFoundationTransport


@lru_cache(maxsize=1)
def _log_llm_forced_mock_once() -> None:
    log_provider_reason("llm", "forced_mock", "PROVIDER_MODE=mock")


@lru_cache(maxsize=1)
def _log_llm_auto_mock_once() -> None:
    log_provider_reason("llm", "missing_yandex_credentials", "using mock transport (auto)")


def build_llm_transport(settings: Settings) -> tuple[LLMTransport, str]:
    """
    Returns (transport, label) where label is 'yandex' | 'mock'.
    """
    if settings.provider_mode == "mock":
        _log_llm_forced_mock_once()
        return LLMMockTransport(), "mock"
    if settings.provider_mode == "real":
        if not settings.yandex_credentials_ready():
            raise RuntimeError("PROVIDER_MODE=real but Yandex credentials or model URI are missing")
        return YandexFoundationTransport(settings), "yandex"
    # auto
    if settings.yandex_credentials_ready():
        return YandexFoundationTransport(settings), "yandex"
    _log_llm_auto_mock_once()
    return LLMMockTransport(), "mock"

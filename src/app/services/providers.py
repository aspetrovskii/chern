from __future__ import annotations

from app.core.config import Settings
from app.core.security import decrypt_secret
from app.db.models import User
from llm.cache import SQLiteTrackCache
from llm.client import LLMClient, RetryPolicy
from llm.service import LLMService
from llm.transport_factory import build_llm_transport
from spotify.factory import build_spotify_catalog

from app.services.pipeline import ConcertPipeline


def get_concert_pipeline(settings: Settings, user: User) -> ConcertPipeline:
    refresh_plain: str | None = None
    if user.refresh_token_encrypted:
        try:
            refresh_plain = decrypt_secret(user.refresh_token_encrypted)
        except Exception:  # noqa: BLE001
            refresh_plain = None
    spotify, _ = build_spotify_catalog(settings, refresh_plain)
    transport, _ = build_llm_transport(settings)
    retry = RetryPolicy(
        attempts=settings.llm_retry_attempts,
        timeout_seconds=settings.llm_timeout_seconds,
        base_backoff_seconds=settings.llm_retry_base_backoff_seconds,
        max_jitter_seconds=settings.llm_retry_max_jitter_seconds,
    )
    llm = LLMService(
        client=LLMClient(transport=transport, retry_policy=retry),
        cache=SQLiteTrackCache(settings.llm_cache_db_path),
    )
    return ConcertPipeline(spotify, llm)

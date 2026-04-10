from __future__ import annotations

from functools import lru_cache

from app.core.config import Settings
from app.core.provider_logging import log_provider_reason
from spotify.client import SpotifyClientMock
from spotify.http_client import SpotifyBackedCatalog


@lru_cache(maxsize=1)
def _log_spotify_oauth_missing_once() -> None:
    log_provider_reason("spotify", "oauth_not_configured", "using mock catalog (auto)")


@lru_cache(maxsize=1)
def _log_spotify_real_misconfig_once() -> None:
    log_provider_reason("spotify", "oauth_not_configured", "PROVIDER_MODE=real but Spotify OAuth env incomplete")


def build_spotify_catalog(settings: Settings, refresh_token_plain: str | None) -> tuple[SpotifyClientMock | SpotifyBackedCatalog, str]:
    """
    Returns (catalog, label) where label is 'spotify' | 'mock'.
    """
    if not settings.spotify_real_allowed():
        if settings.provider_mode == "real":
            _log_spotify_real_misconfig_once()
            raise RuntimeError("Spotify OAuth is not configured (client id/secret/redirect_uri)")
        _log_spotify_oauth_missing_once()
        return SpotifyClientMock(), "mock"
    if not refresh_token_plain:
        log_provider_reason("spotify", "missing_refresh_token", "using mock catalog")
        return SpotifyClientMock(), "mock"
    return SpotifyBackedCatalog(settings, refresh_token_plain), "spotify"

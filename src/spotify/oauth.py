from __future__ import annotations

from urllib.parse import urlencode

import httpx

from app.core.config import Settings
from app.core.provider_logging import log_provider_exchange

_SPOTIFY_TOKEN = "https://accounts.spotify.com/api/token"
_SPOTIFY_AUTH = "https://accounts.spotify.com/authorize"


def fetch_spotify_me(settings: Settings, access_token: str) -> dict:
    with httpx.Client(timeout=settings.spotify_http_timeout_seconds) as client:
        resp = client.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    log_provider_exchange(
        provider="spotify_api",
        event="GET /me",
        status_code=resp.status_code,
        response_body=resp.text,
    )
    resp.raise_for_status()
    return resp.json()


def spotify_authorize_url(*, client_id: str, redirect_uri: str, scopes: str, state: str) -> str:
    q = urlencode(
        {
            "client_id": client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "scope": scopes,
            "state": state,
            "show_dialog": "false",
        }
    )
    return f"{_SPOTIFY_AUTH}?{q}"


def exchange_code_for_tokens(settings: Settings, code: str) -> dict:
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.spotify_redirect_uri,
    }
    return _post_token(settings, data)


def refresh_access_token(settings: Settings, refresh_token: str) -> dict:
    data = {"grant_type": "refresh_token", "refresh_token": refresh_token}
    return _post_token(settings, data)


def _post_token(settings: Settings, data: dict) -> dict:
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(
            _SPOTIFY_TOKEN,
            data=data,
            auth=(settings.spotify_client_id, settings.spotify_client_secret),
        )
    log_provider_exchange(
        provider="spotify_oauth",
        event="token",
        status_code=resp.status_code,
        request_body=str(data),
        response_body=resp.text,
    )
    resp.raise_for_status()
    return resp.json()

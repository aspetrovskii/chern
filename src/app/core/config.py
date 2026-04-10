from typing import Self

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Conce Music AI API"
    api_prefix: str = "/api/v1"
    app_base_url: str = "http://127.0.0.1:8000"
    # Where the SPA lives (OAuth redirect after Spotify login). Override via env: FRONTEND_PUBLIC_URL.
    frontend_public_url: str = "http://127.0.0.1:5173"

    # auto: real when credentials exist; else mock. Per-call degradation stays inside LLMService.
    provider_mode: str = Field(default="auto", description="auto | real | mock")

    jwt_secret: str = "dev-jwt-secret-at-least-32-bytes-long"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24
    db_path: str = "data/sqlite.db"
    llm_cache_db_path: str = "data/llm_cache.db"
    crypto_key: str = "dev-crypto-key-please-change"

    spotify_client_id: str = ""
    spotify_client_secret: str = ""
    spotify_redirect_uri: str = "http://127.0.0.1:8000/api/v1/auth/spotify/callback"
    spotify_scopes: str = (
        "playlist-read-private playlist-read-collaborative "
        "playlist-modify-public playlist-modify-private "
        "user-read-email user-read-private "
        "streaming user-read-playback-state user-modify-playback-state"
    )

    yandex_completion_url: str = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion"
    # Full modelUri, e.g. gpt://b1g.../yandexgpt/rc — preferred.
    yandex_model_uri: str = ""
    # If model_uri empty, built as gpt://{yandex_folder_id}/{yandex_model_id}
    yandex_folder_id: str = ""
    yandex_model_id: str = "yandexgpt/rc"
    yandex_api_key: str = ""
    yandex_iam_token: str = ""

    llm_timeout_seconds: float = 45.0
    llm_retry_attempts: int = 3
    llm_retry_base_backoff_seconds: float = 0.35
    llm_retry_max_jitter_seconds: float = 0.4
    llm_max_tokens: int = 2000
    llm_temperature: float = 0.2

    spotify_http_timeout_seconds: float = 20.0
    spotify_max_retries: int = 3
    spotify_retry_base_delay_seconds: float = 0.5
    spotify_retry_max_jitter_seconds: float = 0.5

    @model_validator(mode="after")
    def _normalize_provider_mode(self) -> Self:
        mode = (self.provider_mode or "auto").strip().lower()
        if mode not in {"auto", "real", "mock"}:
            mode = "auto"
        self.provider_mode = mode
        return self

    def resolved_yandex_model_uri(self) -> str:
        if self.yandex_model_uri.strip():
            return self.yandex_model_uri.strip()
        folder = self.yandex_folder_id.strip()
        mid = self.yandex_model_id.strip() or "yandexgpt/rc"
        if not folder:
            return ""
        return f"gpt://{folder}/{mid}"

    def yandex_credentials_ready(self) -> bool:
        if self.provider_mode == "mock":
            return False
        uri = self.resolved_yandex_model_uri()
        if not uri:
            return False
        return bool(self.yandex_api_key.strip() or self.yandex_iam_token.strip())

    def spotify_oauth_configured(self) -> bool:
        return bool(
            self.spotify_client_id.strip() and self.spotify_client_secret.strip() and self.spotify_redirect_uri.strip()
        )

    def spotify_real_allowed(self) -> bool:
        if self.provider_mode == "mock":
            return False
        if self.provider_mode == "real":
            return self.spotify_oauth_configured()
        return self.spotify_oauth_configured()


settings = Settings()

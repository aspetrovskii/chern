from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Conce Music AI API"
    api_prefix: str = "/api/v1"
    provider_mode: str = "mock"
    jwt_secret: str = "dev-jwt-secret-at-least-32-bytes-long"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24
    db_path: str = "data/sqlite.db"
    llm_cache_db_path: str = "data/llm_cache.db"
    crypto_key: str = "dev-crypto-key-please-change"


settings = Settings()

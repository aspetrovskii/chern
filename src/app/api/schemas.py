from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ErrorDTO(BaseModel):
    error_code: str
    message: str


class AuthLoginResponse(BaseModel):
    auth_url: str
    state: str
    provider_mode: str


class ProvidersStatusDTO(BaseModel):
    """Сводка доступности внешних провайдеров (без пользовательских токенов)."""

    provider_mode: str
    llm: Literal["yandex", "mock"]
    yandex_configured: bool
    spotify_oauth_configured: bool


class AuthCallbackRequest(BaseModel):
    code: str = Field(min_length=1)
    state: str = Field(min_length=1)


class TokenDTO(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserDTO(BaseModel):
    id: int
    spotify_user_id: str
    email: str


class AuthCallbackResponse(BaseModel):
    token: TokenDTO
    user: UserDTO


class ChatCreateRequest(BaseModel):
    title: str = "New chat"


class ChatPatchRequest(BaseModel):
    mode: Literal["fixed_pool", "spotify_discovery"] | None = None
    source_spotify_playlist_id: str | None = None
    target_track_count: int | None = Field(default=None, ge=5, le=30)


class ChatDTO(BaseModel):
    id: int
    title: str
    mode: str
    source_spotify_playlist_id: str | None
    target_track_count: int
    created_at: datetime
    updated_at: datetime


class MessageCreateRequest(BaseModel):
    content: str = Field(min_length=1)


class MessageDTO(BaseModel):
    id: int
    chat_id: int
    role: str
    content: str
    status: str
    structured_intent: dict | None = None
    error: str | None = None
    created_at: datetime


class ConcertDTO(BaseModel):
    id: int
    chat_id: int
    version: int
    ordered_track_ids: list[str]
    spotify_playlist_id: str | None = None
    order_source: str
    created_at: datetime
    updated_at: datetime


class ConcertPatchOrderRequest(BaseModel):
    ordered_track_ids: list[str]


class PoolCreateRequest(BaseModel):
    track_ids: list[str] = Field(default_factory=list)
    album_id: str | None = None
    playlist_id: str | None = None
    artist_id: str | None = None


class PoolDeleteRequest(BaseModel):
    track_ids: list[str] = Field(default_factory=list)


class SpotifyPlaylistDTO(BaseModel):
    id: str
    name: str


class GenerateResponse(BaseModel):
    message_id: int
    status: str

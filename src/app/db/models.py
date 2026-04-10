from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def now_utc() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    spotify_user_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), default="")
    refresh_token_encrypted: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class Chat(Base):
    __tablename__ = "chats"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255), default="New chat")
    mode: Mapped[str] = mapped_column(String(32), default="fixed_pool")
    source_spotify_playlist_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    target_track_count: Mapped[int] = mapped_column(Integer, default=10)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    messages: Mapped[list[Message]] = relationship(back_populates="chat", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chat_id: Mapped[int] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text, default="")
    structured_intent: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="done")
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    chat: Mapped[Chat] = relationship(back_populates="messages")


class Concert(Base):
    __tablename__ = "concerts"
    __table_args__ = (UniqueConstraint("chat_id", "version", name="uq_concert_chat_version"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chat_id: Mapped[int] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"), index=True)
    message_id: Mapped[int | None] = mapped_column(ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    ordered_track_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    spotify_playlist_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    order_source: Mapped[str] = mapped_column(String(32), default="optimizer")
    label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class TrackCache(Base):
    __tablename__ = "tracks_cache"
    spotify_track_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    raw_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    audio_features: Mapped[dict] = mapped_column(JSON, default=dict)
    llm_tags: Mapped[dict] = mapped_column(JSON, default=dict)
    llm_version: Mapped[str] = mapped_column(String(64), default="yagpt-v1.0.0")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)


class ChatPoolTrack(Base):
    __tablename__ = "chat_pool_tracks"
    __table_args__ = (
        UniqueConstraint("chat_id", "spotify_track_id", name="uq_chat_pool_track"),
        Index("idx_chat_pool_chat_track", "chat_id", "spotify_track_id"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chat_id: Mapped[int] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"), index=True)
    spotify_track_id: Mapped[str] = mapped_column(String(128), index=True)
    added_via: Mapped[str] = mapped_column(String(32), default="manual")

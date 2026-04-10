"""init schema

Revision ID: 20260410_01
Revises:
Create Date: 2026-04-10
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260410_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("spotify_user_id", sa.String(length=128), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("refresh_token_encrypted", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_spotify_user_id", "users", ["spotify_user_id"], unique=True)
    op.create_table(
        "chats",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False, server_default="New chat"),
        sa.Column("mode", sa.String(length=32), nullable=False, server_default="fixed_pool"),
        sa.Column("source_spotify_playlist_id", sa.String(length=128), nullable=True),
        sa.Column("target_track_count", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_chats_user_id", "chats", ["user_id"], unique=False)
    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("chat_id", sa.Integer(), sa.ForeignKey("chats.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("structured_intent", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="done"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_messages_chat_id", "messages", ["chat_id"], unique=False)
    op.create_table(
        "concerts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("chat_id", sa.Integer(), sa.ForeignKey("chats.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message_id", sa.Integer(), sa.ForeignKey("messages.id", ondelete="SET NULL"), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("ordered_track_ids", sa.JSON(), nullable=False),
        sa.Column("spotify_playlist_id", sa.String(length=128), nullable=True),
        sa.Column("order_source", sa.String(length=32), nullable=False, server_default="optimizer"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("chat_id", "version", name="uq_concert_chat_version"),
    )
    op.create_index("ix_concerts_chat_id", "concerts", ["chat_id"], unique=False)
    op.create_table(
        "tracks_cache",
        sa.Column("spotify_track_id", sa.String(length=128), primary_key=True),
        sa.Column("raw_metadata", sa.JSON(), nullable=False),
        sa.Column("audio_features", sa.JSON(), nullable=False),
        sa.Column("llm_tags", sa.JSON(), nullable=False),
        sa.Column("llm_version", sa.String(length=64), nullable=False, server_default="yagpt-v1.0.0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_tracks_cache_updated_at", "tracks_cache", ["updated_at"], unique=False)
    op.create_table(
        "chat_pool_tracks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("chat_id", sa.Integer(), sa.ForeignKey("chats.id", ondelete="CASCADE"), nullable=False),
        sa.Column("spotify_track_id", sa.String(length=128), nullable=False),
        sa.Column("added_via", sa.String(length=32), nullable=False, server_default="manual"),
        sa.UniqueConstraint("chat_id", "spotify_track_id", name="uq_chat_pool_track"),
    )
    op.create_index("ix_chat_pool_tracks_chat_id", "chat_pool_tracks", ["chat_id"], unique=False)
    op.create_index("ix_chat_pool_tracks_spotify_track_id", "chat_pool_tracks", ["spotify_track_id"], unique=False)
    op.create_index("idx_chat_pool_chat_track", "chat_pool_tracks", ["chat_id", "spotify_track_id"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_chat_pool_chat_track", table_name="chat_pool_tracks")
    op.drop_index("ix_chat_pool_tracks_spotify_track_id", table_name="chat_pool_tracks")
    op.drop_index("ix_chat_pool_tracks_chat_id", table_name="chat_pool_tracks")
    op.drop_table("chat_pool_tracks")
    op.drop_index("ix_tracks_cache_updated_at", table_name="tracks_cache")
    op.drop_table("tracks_cache")
    op.drop_index("ix_concerts_chat_id", table_name="concerts")
    op.drop_table("concerts")
    op.drop_index("ix_messages_chat_id", table_name="messages")
    op.drop_table("messages")
    op.drop_index("ix_chats_user_id", table_name="chats")
    op.drop_table("chats")
    op.drop_index("ix_users_spotify_user_id", table_name="users")
    op.drop_table("users")

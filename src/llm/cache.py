from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime

from typing import Any

from .models import TrackTagsV1


class SQLiteTrackCache:
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        conn = self._connect()
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS tracks_cache (
                    spotify_track_id TEXT PRIMARY KEY,
                    raw_metadata TEXT,
                    audio_features TEXT,
                    llm_tags TEXT,
                    llm_version TEXT,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_tracks_cache_updated_at ON tracks_cache(updated_at)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_tracks_cache_llm_version ON tracks_cache(llm_version)"
            )
            conn.commit()
        finally:
            conn.close()

    def get(self, spotify_track_id: str, llm_version: str) -> TrackTagsV1 | None:
        conn = self._connect()
        try:
            row = conn.execute(
                """
                SELECT llm_tags
                FROM tracks_cache
                WHERE spotify_track_id = ? AND llm_version = ?
                """,
                (spotify_track_id, llm_version),
            ).fetchone()
        finally:
            conn.close()
        if not row:
            return None
        return TrackTagsV1.from_json(row["llm_tags"])

    def upsert(
        self,
        track_id: str,
        raw_metadata: dict,
        audio_features: dict,
        tags: TrackTagsV1,
    ) -> None:
        now = datetime.now(UTC).isoformat()
        conn = self._connect()
        try:
            conn.execute(
                """
                INSERT INTO tracks_cache (
                    spotify_track_id,
                    raw_metadata,
                    audio_features,
                    llm_tags,
                    llm_version,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(spotify_track_id) DO UPDATE SET
                    raw_metadata = excluded.raw_metadata,
                    audio_features = excluded.audio_features,
                    llm_tags = excluded.llm_tags,
                    llm_version = excluded.llm_version,
                    updated_at = excluded.updated_at
                """,
                (
                    track_id,
                    json.dumps(raw_metadata, ensure_ascii=True),
                    json.dumps(audio_features, ensure_ascii=True),
                    tags.to_json(),
                    tags.llm_version,
                    now,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    def get_display_bundle(self, spotify_track_id: str) -> dict[str, Any] | None:
        """UI-facing metadata when the row exists in LLM cache (post-tagging)."""
        conn = self._connect()
        try:
            row = conn.execute(
                "SELECT raw_metadata, audio_features, llm_tags FROM tracks_cache WHERE spotify_track_id = ?",
                (spotify_track_id,),
            ).fetchone()
        finally:
            conn.close()
        if not row:
            return None
        try:
            raw_meta = json.loads(row["raw_metadata"])
            audio = json.loads(row["audio_features"])
        except (TypeError, json.JSONDecodeError):
            return None
        tag_list: list[str] = []
        try:
            tags_obj = TrackTagsV1.from_json(row["llm_tags"])
            tag_list = list(dict.fromkeys([*tags_obj.genre_tags, *tags_obj.theme_tags]))
        except (TypeError, json.JSONDecodeError, ValueError):
            pass
        tid = str(spotify_track_id).strip()
        return {
            "id": tid,
            "title": str(raw_meta.get("name", "") or tid),
            "artist": str(raw_meta.get("artist", "") or ""),
            "uri": str(raw_meta.get("uri", "") or f"spotify:track:{tid}"),
            "energy": float(audio.get("energy", 0.5) or 0.5),
            "valence": float(audio.get("valence", 0.5) or 0.5),
            "tempo": float(audio.get("tempo", 120.0) or 120.0),
            "tags": tag_list,
        }

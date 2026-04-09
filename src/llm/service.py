from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .cache import SQLiteTrackCache
from .client import LLMClient
from .models import ChatContext, IntentV1, MoodScores, TrackInput, TrackTagsV1
from .normalization import canonicalize_genres, detect_language


@dataclass(frozen=True)
class MetricsSnapshot:
    llm_calls: int = 0
    llm_errors: int = 0
    cache_hits: int = 0
    fallback_count: int = 0


class LLMService:
    def __init__(
        self,
        client: LLMClient,
        cache: SQLiteTrackCache,
        llm_version: str = "yagpt-v1.0.0",
    ) -> None:
        self.client = client
        self.cache = cache
        self.llm_version = llm_version
        self._llm_calls = 0
        self._llm_errors = 0
        self._cache_hits = 0
        self._fallback_count = 0

    def parse_user_intent(self, text: str, chat_context: ChatContext) -> IntentV1:
        prompt = self._build_intent_prompt(text=text, chat_context=chat_context)
        try:
            self._llm_calls += 1
            payload = self.client.complete_json(prompt)
            payload["source_text"] = text
            intent = IntentV1.from_dict(payload)
            intent.genres = canonicalize_genres(intent.genres)
            return intent
        except Exception:  # noqa: BLE001
            self._llm_errors += 1
            self._fallback_count += 1
            return self._fallback_intent(text)

    def tag_track(self, track_input: TrackInput) -> TrackTagsV1:
        cached = self.cache.get(track_input.spotify_track_id, self.llm_version)
        if cached:
            self._cache_hits += 1
            return cached

        prompt = self._build_track_prompt(track_input)
        try:
            self._llm_calls += 1
            payload = self.client.complete_json(prompt)
            payload["spotify_track_id"] = track_input.spotify_track_id
            payload["llm_version"] = self.llm_version
            tags = TrackTagsV1.from_dict(payload)
        except Exception:  # noqa: BLE001
            self._llm_errors += 1
            self._fallback_count += 1
            tags = self._fallback_track_tags(track_input)

        self.cache.upsert(
            track_id=track_input.spotify_track_id,
            raw_metadata=track_input.raw_metadata,
            audio_features=track_input.audio_features,
            tags=tags,
        )
        return tags

    def tag_tracks_batch(self, items: list[TrackInput]) -> list[TrackTagsV1]:
        return [self.tag_track(item) for item in items]

    def metrics(self) -> MetricsSnapshot:
        return MetricsSnapshot(
            llm_calls=self._llm_calls,
            llm_errors=self._llm_errors,
            cache_hits=self._cache_hits,
            fallback_count=self._fallback_count,
        )

    def _fallback_intent(self, text: str) -> IntentV1:
        return IntentV1(
            intent_text=text[:300] if text else "music request",
            genres=[],
            mood_arc="flat",
            energy_target=0.5,
            exclude_artists=[],
            language_detected=detect_language(text),
            confidence=0.35,
            source_text=text,
            degraded=True,
        )

    def _fallback_track_tags(self, track_input: TrackInput) -> TrackTagsV1:
        energy = _clamp01(track_input.audio_features.get("energy", 0.5))
        valence = _clamp01(track_input.audio_features.get("valence", 0.5))
        drive = _clamp01((energy * 0.7) + (track_input.audio_features.get("danceability", 0.5) * 0.3))
        melancholy = _clamp01(1.0 - valence)

        name = str(track_input.raw_metadata.get("name", "")).lower()
        theme_tags = []
        if "love" in name:
            theme_tags.append("love")
        if "night" in name:
            theme_tags.append("night")

        return TrackTagsV1(
            spotify_track_id=track_input.spotify_track_id,
            genre_tags=[],
            theme_tags=theme_tags,
            mood_scores=MoodScores(energy=energy, drive=drive, melancholy=melancholy),
            confidence=0.3,
            llm_version=self.llm_version,
            degraded=True,
        )

    def _build_intent_prompt(self, text: str, chat_context: ChatContext) -> str:
        return f"""
You are a strict JSON generator.
Read user's request in any language (priority ru, also en/tr/zh).
Return only JSON matching schema:
{{
  "schema_version": "intent-v1",
  "intent_text": "string",
  "genres": ["string"],
  "mood_arc": "flat|build_up|peak_then_calm|wave",
  "energy_target": 0.0,
  "exclude_artists": ["string"],
  "language_detected": "ru|en|tr|zh",
  "confidence": 0.0
}}
Context: mode={chat_context.mode}, target_track_count={chat_context.target_track_count}, ui_language={chat_context.ui_language}
User text: {text}
""".strip()

    def _build_track_prompt(self, track_input: TrackInput) -> str:
        return f"""
You are a strict JSON generator.
Based on track metadata and audio features, return:
{{
  "schema_version": "track-tags-v1",
  "genre_tags": ["string"],
  "theme_tags": ["string"],
  "mood_scores": {{
    "energy": 0.0,
    "drive": 0.0,
    "melancholy": 0.0
  }},
  "confidence": 0.0
}}
Metadata: {track_input.raw_metadata}
Audio features: {track_input.audio_features}
""".strip()


def _clamp01(value: Any) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0.5
    if numeric < 0.0:
        return 0.0
    if numeric > 1.0:
        return 1.0
    return numeric

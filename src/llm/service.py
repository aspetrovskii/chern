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

    def generate_playlist(
        self,
        user_text: str,
        chat_context: ChatContext,
        candidates: list[TrackInput],
    ) -> list[str]:
        if not candidates:
            return []

        intent = self.parse_user_intent(user_text, chat_context)
        tagged_items = [(item, self.tag_track(item)) for item in candidates]

        scored: list[tuple[TrackInput, TrackTagsV1, float]] = []
        excluded = {artist.strip().lower() for artist in intent.exclude_artists if artist.strip()}
        for item, tags in tagged_items:
            if _is_excluded(item, excluded):
                continue
            score = _base_relevance_score(intent, tags)
            scored.append((item, tags, score))

        if not scored:
            scored = [(item, tags, _base_relevance_score(intent, tags)) for item, tags in tagged_items]

        scored.sort(key=lambda row: row[2], reverse=True)
        top = scored[: chat_context.target_track_count]
        ordered = _order_by_arc(intent.mood_arc, top, intent.energy_target)
        return [item.spotify_track_id for item, _tags, _score in ordered]

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


def _artist_names(track_input: TrackInput) -> list[str]:
    artists = track_input.raw_metadata.get("artists", [])
    if isinstance(artists, str):
        return [artists]
    if not isinstance(artists, list):
        return []
    names: list[str] = []
    for artist in artists:
        if isinstance(artist, dict):
            value = artist.get("name", "")
        else:
            value = str(artist)
        value = str(value).strip()
        if value:
            names.append(value)
    return names


def _is_excluded(track_input: TrackInput, excluded_artists: set[str]) -> bool:
    if not excluded_artists:
        return False
    for name in _artist_names(track_input):
        if name.lower() in excluded_artists:
            return True
    return False


def _base_relevance_score(intent: IntentV1, tags: TrackTagsV1) -> float:
    genre_overlap = 0.0
    if intent.genres:
        overlap = len(set(intent.genres).intersection(tags.genre_tags))
        genre_overlap = overlap / max(1, len(intent.genres))

    energy_alignment = 1.0 - abs(tags.mood_scores.energy - intent.energy_target)
    drive_alignment = 1.0 - abs(tags.mood_scores.drive - intent.energy_target)
    confidence = tags.confidence

    return (0.45 * genre_overlap) + (0.3 * energy_alignment) + (0.15 * drive_alignment) + (0.1 * confidence)


def _order_by_arc(
    mood_arc: str,
    scored: list[tuple[TrackInput, TrackTagsV1, float]],
    energy_target: float,
) -> list[tuple[TrackInput, TrackTagsV1, float]]:
    if mood_arc == "build_up":
        return sorted(scored, key=lambda row: row[1].mood_scores.energy)
    if mood_arc == "peak_then_calm":
        ordered = sorted(scored, key=lambda row: row[1].mood_scores.energy)
        mid = len(ordered) // 2
        return ordered[:mid] + list(reversed(ordered[mid:]))
    if mood_arc == "wave":
        ordered = sorted(scored, key=lambda row: row[1].mood_scores.energy)
        low, high = 0, len(ordered) - 1
        wave: list[tuple[TrackInput, TrackTagsV1, float]] = []
        pick_high = False
        while low <= high:
            if pick_high:
                wave.append(ordered[high])
                high -= 1
            else:
                wave.append(ordered[low])
                low += 1
            pick_high = not pick_high
        return wave

    # flat/default: keep tracks around target energy.
    return sorted(scored, key=lambda row: abs(row[1].mood_scores.energy - energy_target))

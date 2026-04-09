from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from typing import Any, Literal


SUPPORTED_LANGUAGES = {"ru", "en", "tr", "zh"}


def _clamp01(value: Any, default: float = 0.5) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if number < 0.0:
        return 0.0
    if number > 1.0:
        return 1.0
    return number


def _normalize_tags(values: list[str]) -> list[str]:
    clean: list[str] = []
    seen = set()
    for raw in values:
        token = str(raw).strip().lower()
        if not token or token in seen:
            continue
        clean.append(token)
        seen.add(token)
    return clean


@dataclass(slots=True)
class ChatContext:
    chat_id: str
    message_id: str
    request_id: str
    mode: Literal["fixed_pool", "spotify_discovery"] = "fixed_pool"
    target_track_count: int = 10
    ui_language: str | None = None

    def __post_init__(self) -> None:
        if self.mode not in {"fixed_pool", "spotify_discovery"}:
            self.mode = "fixed_pool"
        try:
            count = int(self.target_track_count)
        except (TypeError, ValueError):
            count = 10
        self.target_track_count = max(1, min(count, 200))


@dataclass(slots=True)
class IntentV1:
    schema_version: Literal["intent-v1"] = "intent-v1"
    intent_text: str = "music request"
    genres: list[str] = field(default_factory=list)
    mood_arc: str = "flat"
    energy_target: float = 0.5
    exclude_artists: list[str] = field(default_factory=list)
    language_detected: str = "ru"
    confidence: float = 0.5
    source_text: str | None = None
    degraded: bool = False

    def __post_init__(self) -> None:
        self.intent_text = (self.intent_text or "music request").strip()[:300]
        self.genres = _normalize_tags(self.genres)
        self.exclude_artists = [a.strip() for a in self.exclude_artists if str(a).strip()]
        lang = str(self.language_detected).strip().lower()
        self.language_detected = lang if lang in SUPPORTED_LANGUAGES else "ru"
        self.energy_target = _clamp01(self.energy_target)
        self.confidence = _clamp01(self.confidence)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "IntentV1":
        return cls(
            schema_version="intent-v1",
            intent_text=data.get("intent_text", "music request"),
            genres=list(data.get("genres", [])),
            mood_arc=str(data.get("mood_arc", "flat")),
            energy_target=data.get("energy_target", 0.5),
            exclude_artists=list(data.get("exclude_artists", [])),
            language_detected=data.get("language_detected", "ru"),
            confidence=data.get("confidence", 0.5),
            source_text=data.get("source_text"),
            degraded=bool(data.get("degraded", False)),
        )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class MoodScores:
    energy: float = 0.5
    drive: float = 0.5
    melancholy: float = 0.2

    def __post_init__(self) -> None:
        self.energy = _clamp01(self.energy)
        self.drive = _clamp01(self.drive)
        self.melancholy = _clamp01(self.melancholy)


@dataclass(slots=True)
class TrackTagsV1:
    schema_version: Literal["track-tags-v1"] = "track-tags-v1"
    spotify_track_id: str = ""
    genre_tags: list[str] = field(default_factory=list)
    theme_tags: list[str] = field(default_factory=list)
    mood_scores: MoodScores = field(default_factory=MoodScores)
    confidence: float = 0.5
    llm_version: str = "yagpt-v1.0.0"
    degraded: bool = False

    def __post_init__(self) -> None:
        self.spotify_track_id = str(self.spotify_track_id).strip()
        self.genre_tags = _normalize_tags(self.genre_tags)
        self.theme_tags = _normalize_tags(self.theme_tags)
        self.confidence = _clamp01(self.confidence)
        self.llm_version = str(self.llm_version).strip() or "yagpt-v1.0.0"

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "TrackTagsV1":
        scores_raw = data.get("mood_scores", {}) or {}
        return cls(
            schema_version="track-tags-v1",
            spotify_track_id=data.get("spotify_track_id", ""),
            genre_tags=list(data.get("genre_tags", [])),
            theme_tags=list(data.get("theme_tags", [])),
            mood_scores=MoodScores(
                energy=scores_raw.get("energy", 0.5),
                drive=scores_raw.get("drive", 0.5),
                melancholy=scores_raw.get("melancholy", 0.2),
            ),
            confidence=data.get("confidence", 0.5),
            llm_version=data.get("llm_version", "yagpt-v1.0.0"),
            degraded=bool(data.get("degraded", False)),
        )

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["mood_scores"] = asdict(self.mood_scores)
        return payload

    @classmethod
    def from_json(cls, raw: str) -> "TrackTagsV1":
        return cls.from_dict(json.loads(raw))

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=True)


@dataclass(slots=True)
class TrackInput:
    spotify_track_id: str
    raw_metadata: dict[str, Any] = field(default_factory=dict)
    audio_features: dict[str, float] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.spotify_track_id = str(self.spotify_track_id).strip()
        normalized: dict[str, float] = {}
        for key, value in self.audio_features.items():
            try:
                normalized[str(key)] = float(value)
            except (TypeError, ValueError):
                continue
        self.audio_features = normalized

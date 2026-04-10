from __future__ import annotations

import json
import tempfile

from llm.cache import SQLiteTrackCache
from llm.client import LLMClient
from llm.models import ChatContext, TrackInput
from llm.service import LLMService


class SmokeTransport:
    def __init__(self) -> None:
        self.calls = 0

    def complete(self, prompt: str, timeout_seconds: float) -> str:
        self.calls += 1
        if '"schema_version": "intent-v1"' in prompt:
            return json.dumps(
                {
                    "schema_version": "intent-v1",
                    "intent_text": "energetic concert set",
                    "genres": ["rock"],
                    "mood_arc": "build_up",
                    "energy_target": 0.8,
                    "exclude_artists": [],
                    "language_detected": "en",
                    "confidence": 0.9,
                }
            )
        return json.dumps(
            {
                "schema_version": "track-tags-v1",
                "genre_tags": ["rock"],
                "theme_tags": ["arena"],
                "mood_scores": {"energy": 0.85, "drive": 0.8, "melancholy": 0.1},
                "confidence": 0.8,
            }
        )


def run() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        service = LLMService(
            client=LLMClient(transport=SmokeTransport()),
            cache=SQLiteTrackCache(f"{tmp}/smoke.db"),
        )
        intent = service.parse_user_intent(
            text="Собери концерт в рок-стиле",
            chat_context=ChatContext(chat_id="smoke-chat", message_id="smoke-msg", request_id="smoke-req"),
        )
        assert intent.schema_version == "intent-v1"
        assert not intent.degraded

        track = TrackInput(
            spotify_track_id="smoke-track-1",
            raw_metadata={"name": "Arena Lights"},
            audio_features={"energy": 0.83, "valence": 0.58, "danceability": 0.6},
        )
        first = service.tag_track(track)
        second = service.tag_track(track)

        assert first.schema_version == "track-tags-v1"
        assert second.genre_tags == ["rock"]
        assert service.metrics().cache_hits == 1
        assert service.metrics().fallback_count == 0

    print("smoke_llm_pipeline: OK")


if __name__ == "__main__":
    run()

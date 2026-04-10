from __future__ import annotations

import json
import tempfile
import unittest

from llm.cache import SQLiteTrackCache
from llm.client import LLMClient
from llm.models import ChatContext, TrackInput
from llm.service import LLMService


class FakeTransport:
    def __init__(self, responses: list[str] | None = None, fail_times: int = 0) -> None:
        self.responses = responses or []
        self.fail_times = fail_times
        self.calls = 0

    def complete(self, prompt: str, timeout_seconds: float) -> str:
        self.calls += 1
        if self.calls <= self.fail_times:
            raise TimeoutError("timeout")
        if self.responses:
            return self.responses.pop(0)
        raise RuntimeError("no response configured")


class LLMServiceTests(unittest.TestCase):
    def _service(self, transport: FakeTransport, db_path: str) -> LLMService:
        return LLMService(
            client=LLMClient(transport=transport),
            cache=SQLiteTrackCache(db_path),
        )

    def test_parse_user_intent_success(self) -> None:
        payload = {
            "schema_version": "intent-v1",
            "intent_text": "dynamic rock songs about freedom",
            "genres": ["rock", "hip hop"],
            "mood_arc": "build_up",
            "energy_target": 0.8,
            "exclude_artists": [],
            "language_detected": "en",
            "confidence": 0.9,
        }
        with tempfile.TemporaryDirectory() as tmp:
            transport = FakeTransport(responses=[json.dumps(payload)])
            service = self._service(transport, f"{tmp}/test.db")
            intent = service.parse_user_intent(
                text="play energetic rock",
                chat_context=ChatContext(chat_id="c1", message_id="m1", request_id="r1"),
            )
        self.assertEqual(intent.schema_version, "intent-v1")
        self.assertEqual(intent.genres, ["rock", "hip-hop"])
        self.assertEqual(intent.confidence, 0.9)
        self.assertFalse(intent.degraded)

    def test_parse_user_intent_fallback_on_invalid_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            transport = FakeTransport(responses=["not-json"])
            service = self._service(transport, f"{tmp}/test.db")
            intent = service.parse_user_intent(
                text="что-то бодрое",
                chat_context=ChatContext(chat_id="c1", message_id="m1", request_id="r1"),
            )
        self.assertTrue(intent.degraded)
        self.assertEqual(intent.language_detected, "ru")

    def test_tag_track_cache_miss_then_hit(self) -> None:
        payload = {
            "schema_version": "track-tags-v1",
            "genre_tags": ["rock"],
            "theme_tags": ["road"],
            "mood_scores": {"energy": 0.8, "drive": 0.7, "melancholy": 0.2},
            "confidence": 0.85,
        }
        with tempfile.TemporaryDirectory() as tmp:
            transport = FakeTransport(responses=[json.dumps(payload)])
            service = self._service(transport, f"{tmp}/test.db")
            track_input = TrackInput(
                spotify_track_id="track1",
                raw_metadata={"name": "Freedom Road"},
                audio_features={"energy": 0.8, "valence": 0.4, "danceability": 0.5},
            )
            first = service.tag_track(track_input)
            second = service.tag_track(track_input)

        self.assertEqual(first.schema_version, "track-tags-v1")
        self.assertEqual(second.genre_tags, ["rock"])
        self.assertEqual(transport.calls, 1)
        self.assertEqual(service.metrics().cache_hits, 1)

    def test_tag_track_fallback_on_errors(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            transport = FakeTransport(fail_times=3)
            service = self._service(transport, f"{tmp}/test.db")
            track_input = TrackInput(
                spotify_track_id="track2",
                raw_metadata={"name": "Love At Night"},
                audio_features={"energy": 0.3, "valence": 0.2, "danceability": 0.4},
            )
            tags = service.tag_track(track_input)

        self.assertTrue(tags.degraded)
        self.assertIn("love", tags.theme_tags)
        self.assertGreaterEqual(tags.mood_scores.melancholy, 0.7)

    def test_generate_playlist_returns_ordered_track_ids(self) -> None:
        intent_payload = {
            "schema_version": "intent-v1",
            "intent_text": "energetic rock",
            "genres": ["rock"],
            "mood_arc": "build_up",
            "energy_target": 0.8,
            "exclude_artists": ["artist x"],
            "language_detected": "en",
            "confidence": 0.9,
        }
        track1_payload = {
            "schema_version": "track-tags-v1",
            "genre_tags": ["rock"],
            "theme_tags": ["road"],
            "mood_scores": {"energy": 0.2, "drive": 0.3, "melancholy": 0.4},
            "confidence": 0.8,
        }
        track2_payload = {
            "schema_version": "track-tags-v1",
            "genre_tags": ["rock"],
            "theme_tags": ["live"],
            "mood_scores": {"energy": 0.9, "drive": 0.9, "melancholy": 0.1},
            "confidence": 0.85,
        }
        track3_payload = {
            "schema_version": "track-tags-v1",
            "genre_tags": ["rock"],
            "theme_tags": ["night"],
            "mood_scores": {"energy": 0.5, "drive": 0.5, "melancholy": 0.3},
            "confidence": 0.82,
        }
        responses = [
            json.dumps(intent_payload),
            json.dumps(track1_payload),
            json.dumps(track2_payload),
            json.dumps(track3_payload),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            transport = FakeTransport(responses=responses)
            service = self._service(transport, f"{tmp}/test.db")
            candidates = [
                TrackInput(
                    spotify_track_id="t1",
                    raw_metadata={"name": "Low Start", "artists": [{"name": "Artist A"}]},
                    audio_features={"energy": 0.2},
                ),
                TrackInput(
                    spotify_track_id="t2",
                    raw_metadata={"name": "Peak Song", "artists": [{"name": "Artist B"}]},
                    audio_features={"energy": 0.9},
                ),
                TrackInput(
                    spotify_track_id="t3",
                    raw_metadata={"name": "Excluded", "artists": [{"name": "Artist X"}]},
                    audio_features={"energy": 0.5},
                ),
            ]
            ordered = service.generate_playlist(
                user_text="need energetic rock",
                chat_context=ChatContext(chat_id="c1", message_id="m1", request_id="r1", target_track_count=10),
                candidates=candidates,
            )

        self.assertEqual(ordered, ["t1", "t2"])


if __name__ == "__main__":
    unittest.main()

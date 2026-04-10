from __future__ import annotations

import hashlib
import json


class LLMMockTransport:
    """Deterministic JSON responses for local dev and provider_mode=mock."""

    def complete(self, prompt: str, timeout_seconds: float) -> str:
        _ = timeout_seconds
        p = prompt.lower()
        if "track-tags" in p or "genre_tags" in p or "mood_scores" in p:
            return self._track_tags_json(prompt)
        return self._intent_json(prompt)

    def _intent_json(self, prompt: str) -> str:
        h = int(hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:8], 16)
        genres = [["indie", "electronic"], ["rock"], ["pop", "dance"]][h % 3]
        arcs = ["flat", "build_up", "wave"]
        payload = {
            "schema_version": "intent-v1",
            "intent_text": "mock intent from user request",
            "genres": genres,
            "mood_arc": arcs[h % 3],
            "energy_target": 0.35 + (h % 50) / 100.0,
            "exclude_artists": [],
            "language_detected": "ru" if any(c in prompt for c in "абвгдеёжзийклмнопрстуфхцчшщъыьэюя") else "en",
            "confidence": 0.55,
        }
        return json.dumps(payload, ensure_ascii=True)

    def _track_tags_json(self, prompt: str) -> str:
        h = int(hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:8], 16)
        energy = 0.3 + (h % 60) / 100.0
        payload = {
            "schema_version": "track-tags-v1",
            "genre_tags": ["mock-genre"],
            "theme_tags": ["mock-theme"],
            "mood_scores": {
                "energy": min(1.0, energy),
                "drive": min(1.0, energy + 0.1),
                "melancholy": max(0.0, 0.9 - energy),
            },
            "confidence": 0.5,
        }
        return json.dumps(payload, ensure_ascii=True)

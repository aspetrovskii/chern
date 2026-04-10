from __future__ import annotations

import argparse
import json
from pathlib import Path

from .cache import SQLiteTrackCache
from .client import build_client_from_env
from .models import ChatContext, TrackInput
from .service import LLMService


def _read_candidates(path: Path) -> list[TrackInput]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("Candidates file must contain a JSON array")
    items: list[TrackInput] = []
    for row in payload:
        if not isinstance(row, dict):
            continue
        track_id = str(row.get("spotify_track_id", "")).strip()
        if not track_id:
            continue
        items.append(
            TrackInput(
                spotify_track_id=track_id,
                raw_metadata=dict(row.get("raw_metadata", {}) or {}),
                audio_features=dict(row.get("audio_features", {}) or {}),
            )
        )
    return items


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate ordered playlist from candidate tracks.")
    parser.add_argument("--text", required=True, help="User request text for playlist generation.")
    parser.add_argument("--candidates", required=True, help="Path to JSON array of candidate tracks.")
    parser.add_argument("--db-path", default="./llm_cache.db", help="SQLite cache path.")
    parser.add_argument("--chat-id", default="dev-chat")
    parser.add_argument("--message-id", default="dev-message")
    parser.add_argument("--request-id", default="dev-request")
    parser.add_argument("--target-count", type=int, default=10)
    args = parser.parse_args()

    candidates = _read_candidates(Path(args.candidates))
    client = build_client_from_env()
    service = LLMService(client=client, cache=SQLiteTrackCache(args.db_path))
    context = ChatContext(
        chat_id=args.chat_id,
        message_id=args.message_id,
        request_id=args.request_id,
        target_track_count=args.target_count,
    )
    ordered_track_ids = service.generate_playlist(args.text, context, candidates)
    print(json.dumps({"ordered_track_ids": ordered_track_ids}, ensure_ascii=True))


if __name__ == "__main__":
    main()

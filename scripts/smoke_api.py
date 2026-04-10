from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient


def run() -> None:
    from app.main import app

    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200

        callback = client.post("/api/v1/auth/spotify/callback", json={"code": "abc", "state": "mock-state"})
        assert callback.status_code == 200
        token = callback.json()["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        chat = client.post("/api/v1/chats", headers=headers, json={"title": "Smoke Chat"})
        assert chat.status_code == 200
        chat_id = chat.json()["id"]
        mode_patch = client.patch(
            f"/api/v1/chats/{chat_id}",
            headers=headers,
            json={"mode": "spotify_discovery"},
        )
        assert mode_patch.status_code == 200

        gen = client.post(
            f"/api/v1/chats/{chat_id}/messages",
            headers=headers,
            json={"content": "rock concert with build up"},
        )
        assert gen.status_code == 202

        concert = client.get(f"/api/v1/chats/{chat_id}/concert", headers=headers)
        assert concert.status_code == 200
        ordered_track_ids = concert.json()["ordered_track_ids"]
        assert len(ordered_track_ids) > 0

        patch = client.patch(
            f"/api/v1/chats/{chat_id}/concert/order",
            headers=headers,
            json={"ordered_track_ids": list(reversed(ordered_track_ids))},
        )
        assert patch.status_code == 200

    print("smoke_api: OK")


def _run_isolated_subprocess() -> None:
    """Unset provider creds for deterministic mock OAuth; use a temp DB to avoid clashing with a running API."""
    fd, db_path = tempfile.mkstemp(suffix="-smoke.sqlite")
    os.close(fd)
    llm_path = f"{db_path}.llm"
    env = os.environ.copy()
    env["DB_PATH"] = db_path
    env["LLM_CACHE_DB_PATH"] = llm_path
    env["SMOKE_API_SUBPROCESS"] = "1"
    env["PROVIDER_MODE"] = "mock"
    # Empty strings override values from `.env` (pydantic-settings would else re-read the file).
    env["SPOTIFY_CLIENT_ID"] = ""
    env["SPOTIFY_CLIENT_SECRET"] = ""
    env["YANDEX_API_KEY"] = ""
    env["YANDEX_IAM_TOKEN"] = ""
    env["YANDEX_MODEL_URI"] = ""
    env["YANDEX_FOLDER_ID"] = ""
    try:
        subprocess.check_call([sys.executable, __file__], env=env)
    finally:
        Path(db_path).unlink(missing_ok=True)
        Path(llm_path).unlink(missing_ok=True)


if __name__ == "__main__":
    if os.environ.get("SMOKE_API_SUBPROCESS") != "1":
        _run_isolated_subprocess()
    else:
        run()

from fastapi.testclient import TestClient

from app.main import app


def run() -> None:
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


if __name__ == "__main__":
    run()

from __future__ import annotations

import random
import time
from typing import Any

import httpx

from app.core.config import Settings
from app.core.provider_logging import log_provider_exchange, log_provider_reason
from spotify.client import SpotifyTrack
from spotify.oauth import refresh_access_token

_SPOTIFY_API = "https://api.spotify.com/v1"


class SpotifyBackedCatalog:
    """Spotify Web API using a user's refresh token (access token refreshed lazily)."""

    def __init__(self, settings: Settings, refresh_token: str) -> None:
        self._settings = settings
        self._refresh = refresh_token
        self._access: str | None = None

    def refreshed_refresh_token(self) -> str | None:
        """If Spotify returned a new refresh token, it is kept here for persistence by the caller."""
        return self._refresh

    def _ensure_access(self) -> str:
        if self._access:
            return self._access
        data = refresh_access_token(self._settings, self._refresh)
        self._access = data["access_token"]
        if data.get("refresh_token"):
            self._refresh = data["refresh_token"]
        return self._access

    def _sleep_backoff(self, attempt: int, retry_after: float | None) -> None:
        if retry_after is not None and retry_after > 0:
            time.sleep(min(retry_after, 60.0))
            return
        base = self._settings.spotify_retry_base_delay_seconds * (2**attempt)
        jitter = random.uniform(0.0, max(0.0, self._settings.spotify_retry_max_jitter_seconds))
        time.sleep(base + jitter)

    def _request(self, method: str, path: str, params: dict[str, Any] | None = None) -> httpx.Response:
        url = f"{_SPOTIFY_API}{path}"
        last: httpx.Response | None = None
        for attempt in range(self._settings.spotify_max_retries):
            token = self._ensure_access()
            headers = {"Authorization": f"Bearer {token}"}
            with httpx.Client(timeout=self._settings.spotify_http_timeout_seconds) as client:
                resp = client.request(method, url, headers=headers, params=params)
            log_provider_exchange(
                provider="spotify_api",
                event=f"{method} {path}",
                status_code=resp.status_code,
                response_body=resp.text,
            )
            last = resp
            if resp.status_code == 401:
                self._access = None
                continue
            if resp.status_code == 429:
                ra = resp.headers.get("Retry-After")
                try:
                    retry_after = float(ra) if ra is not None else None
                except ValueError:
                    retry_after = None
                self._sleep_backoff(attempt, retry_after)
                continue
            return resp
        assert last is not None
        return last

    def get_user_playlists(self) -> list[dict]:
        out: list[dict] = []
        offset = 0
        while True:
            r = self._request("GET", "/me/playlists", params={"limit": 50, "offset": offset})
            if r.status_code >= 400:
                log_provider_reason("spotify", "playlists_http_error", str(r.status_code))
                r.raise_for_status()
            data = r.json()
            for item in data.get("items", []):
                out.append({"id": item.get("id", ""), "name": item.get("name", "")})
            total = data.get("total", len(out))
            offset += len(data.get("items", []))
            if offset >= total or not data.get("items"):
                break
        return out

    def get_tracks_for_playlist(self, playlist_id: str) -> list[SpotifyTrack]:
        if not playlist_id:
            return []
        ids: list[str] = []
        offset = 0
        while True:
            r = self._request(
                "GET",
                f"/playlists/{playlist_id}/tracks",
                params={"limit": 100, "offset": offset},
            )
            if r.status_code >= 400:
                r.raise_for_status()
            data = r.json()
            items = data.get("items", [])
            for row in items:
                t = row.get("track")
                if not t or t.get("is_local"):
                    continue
                tid = t.get("id")
                if tid:
                    ids.append(tid)
            if not items or not data.get("next"):
                break
            offset += len(items)
        return self._hydrate_tracks(ids)

    def discovery_tracks(self, query: str, limit: int = 100) -> list[SpotifyTrack]:
        target = min(max(limit, 1), 300)
        ids: list[str] = []
        offset = 0
        pages = 0
        while len(ids) < target and pages < 5:
            r = self._request(
                "GET",
                "/search",
                params={"q": query, "type": "track", "limit": min(50, target - len(ids)), "offset": offset},
            )
            if r.status_code >= 400:
                r.raise_for_status()
            tracks = (r.json().get("tracks") or {}).get("items", [])
            if not tracks:
                break
            for t in tracks:
                tid = t.get("id")
                if tid and tid not in ids:
                    ids.append(tid)
            offset += len(tracks)
            pages += 1
        if len(ids) < target and ids:
            seed = ",".join(ids[:5])
            need = target - len(ids)
            r2 = self._request(
                "GET",
                "/recommendations",
                params={"seed_tracks": seed, "limit": min(100, need)},
            )
            if r2.status_code == 200:
                for t in r2.json().get("tracks", []) or []:
                    tid = t.get("id")
                    if tid and tid not in ids:
                        ids.append(tid)
        return self._hydrate_tracks(ids[:target])

    def get_tracks_for_album(self, album_id: str) -> list[SpotifyTrack]:
        if not album_id:
            return []
        ids: list[str] = []
        offset = 0
        while True:
            r = self._request(
                "GET",
                f"/albums/{album_id}/tracks",
                params={"limit": 50, "offset": offset, "market": "US"},
            )
            if r.status_code >= 400:
                r.raise_for_status()
            data = r.json()
            for item in data.get("items", []) or []:
                tid = item.get("id")
                if tid:
                    ids.append(tid)
            if not data.get("items") or not data.get("next"):
                break
            offset += len(data["items"])
        return self._hydrate_tracks(ids)

    def get_tracks_for_artist(self, artist_id: str) -> list[SpotifyTrack]:
        if not artist_id:
            return []
        r = self._request("GET", f"/artists/{artist_id}/top-tracks", params={"market": "US"})
        if r.status_code >= 400:
            r.raise_for_status()
        ids = [t.get("id") for t in (r.json().get("tracks") or []) if t and t.get("id")]
        return self._hydrate_tracks(ids)

    def get_tracks_by_ids(self, ids: list[str]) -> list[SpotifyTrack]:
        return self._hydrate_tracks([i for i in ids if i])

    def _hydrate_tracks(self, ids: list[str]) -> list[SpotifyTrack]:
        if not ids:
            return []
        tracks_meta: dict[str, dict] = {}
        for i in range(0, len(ids), 50):
            batch = ids[i : i + 50]
            r = self._request("GET", "/tracks", params={"ids": ",".join(batch)})
            if r.status_code >= 400:
                r.raise_for_status()
            for t in r.json().get("tracks", []) or []:
                if t and t.get("id"):
                    tracks_meta[t["id"]] = t
        features: dict[str, dict] = {}
        for i in range(0, len(ids), 100):
            batch = ids[i : i + 100]
            r = self._request("GET", "/audio-features", params={"ids": ",".join(batch)})
            if r.status_code >= 400:
                continue
            for feat in r.json().get("audio_features", []) or []:
                if feat and feat.get("id"):
                    features[feat["id"]] = feat
        out: list[SpotifyTrack] = []
        for tid in ids:
            t = tracks_meta.get(tid)
            if not t:
                continue
            artists = ", ".join(a.get("name", "") for a in t.get("artists", []))
            name = t.get("name") or ""
            uri = t.get("uri") or f"spotify:track:{tid}"
            f = features.get(tid, {})
            energy = float(f.get("energy") or 0.5)
            valence = float(f.get("valence") or 0.5)
            tempo = float(f.get("tempo") or 120.0)
            out.append(
                SpotifyTrack(
                    spotify_track_id=tid,
                    name=name,
                    artist=artists,
                    uri=uri,
                    energy=energy,
                    valence=valence,
                    tempo=tempo,
                )
            )
        return out

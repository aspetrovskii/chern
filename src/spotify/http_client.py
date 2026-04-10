from __future__ import annotations

import hashlib
import json
import random
import re
import time
from pathlib import Path
from typing import Any

import httpx

from app.core.config import Settings
from app.core.provider_logging import log_provider_exchange, log_provider_reason
from spotify.client import SpotifyTrack
from spotify.oauth import refresh_access_token

_SPOTIFY_API = "https://api.spotify.com/v1"
# Spotipy / Web API: per-type search limit min 1, max 50 (see spotipy search() docstring).
_SPOTIFY_SEARCH_MAX_LIMIT = 50
_SPOTIFY_SEARCH_MAX_OFFSET = 1000
# Get Several Tracks: max 50 ids per request (comma-separated query param).
_SPOTIFY_TRACKS_API_MAX_IDS = 50

def _agent_debug_log_path() -> Path:
    """Prefer /app/data in Docker (named volume); else repo root for local runs."""
    data_dir = Path("/app/data")
    if data_dir.is_dir():
        return data_dir / "debug-658fca.log"
    return Path(__file__).resolve().parents[2] / "debug-658fca.log"


def _agent_debug_log(message: str, hypothesis_id: str, data: dict[str, Any] | None = None) -> None:
    # #region agent log
    try:
        payload: dict[str, Any] = {
            "sessionId": "658fca",
            "hypothesisId": hypothesis_id,
            "location": "src/spotify/http_client.py",
            "message": message,
            "data": data or {},
            "timestamp": int(time.time() * 1000),
        }
        with _agent_debug_log_path().open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except Exception:
        pass
    # #endregion


def _track_json_to_stub(t: dict) -> SpotifyTrack | None:
    """Build SpotifyTrack from search/recommendations JSON (no extra track GET)."""
    tid = t.get("id")
    if not tid:
        return None
    name = str(t.get("name") or "")
    artists = ", ".join(str(a.get("name", "")) for a in (t.get("artists") or []) if a)
    uri = str(t.get("uri") or f"spotify:track:{tid}")
    return SpotifyTrack(
        spotify_track_id=tid,
        name=name,
        artist=artists,
        uri=uri,
        energy=0.5,
        valence=0.5,
        tempo=120.0,
    )


def _normalize_spotify_search_query(raw: str) -> str:
    s = (raw or "").strip()
    if not s:
        return "music"
    # Spotify may respond with misleading 400 "Invalid limit" for punctuation-heavy q (e.g. "word!!!!").
    s = re.sub(r"[!?.#]{2,}", " ", s)
    s = re.sub(r"[!?.#]+$", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    if not s:
        return "music"
    return s[:100]


def _strip_noisy_spotify_query_chars(raw: str) -> str:
    s = _normalize_spotify_search_query(raw)
    s2 = re.sub(r"[^\w\s\u0400-\u04FF-]", " ", s, flags=re.UNICODE)
    s2 = re.sub(r"\s+", " ", s2).strip()
    return s2[:80] or "music"


class SpotifyBackedCatalog:
    """Spotify Web API using a user's refresh token (access token refreshed lazily)."""

    # Process-wide: each FastAPI request used to create a new catalog and call refresh_token every time.
    _access_by_refresh_hash: dict[str, tuple[str, float]] = {}
    _audio_features_skip: bool = False

    @staticmethod
    def _normalize_market_value(raw: str) -> str | None:
        """Only ISO 3166-1 alpha-2 or literal from_token; else None (omit param).

        Invalid values (e.g. \"10\" pasted into SPOTIFY_MARKET) often yield 400 with a
        misleading Spotify body: {\"message\": \"Invalid limit\"}.
        """
        s = (raw or "").strip()
        if not s:
            return None
        if s.lower() == "from_token":
            return "from_token"
        if len(s) == 2 and s.isalpha():
            return s.upper()
        return None

    def __init__(self, settings: Settings, refresh_token: str) -> None:
        self._settings = settings
        self._refresh = refresh_token
        self._access: str | None = None
        self._rt_hash = hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()
        self._market = self._normalize_market_value((settings.spotify_market or "").strip())

    def refreshed_refresh_token(self) -> str | None:
        """If Spotify returned a new refresh token, it is kept here for persistence by the caller."""
        return self._refresh

    def _ensure_access(self) -> str:
        if self._access:
            return self._access
        now = time.monotonic()
        hit = SpotifyBackedCatalog._access_by_refresh_hash.get(self._rt_hash)
        if hit is not None:
            token, until = hit
            if until > now + 30.0:
                self._access = token
                # #region agent log
                _agent_debug_log(
                    "access_token_cache_hit",
                    "H1",
                    {"rt_prefix": self._rt_hash[:12], "expires_in_s": round(until - now, 1)},
                )
                # #endregion
                return self._access
            SpotifyBackedCatalog._access_by_refresh_hash.pop(self._rt_hash, None)
        data = refresh_access_token(self._settings, self._refresh)
        self._access = data["access_token"]
        if data.get("refresh_token"):
            new_r = data["refresh_token"]
            if new_r != self._refresh:
                SpotifyBackedCatalog._access_by_refresh_hash.pop(self._rt_hash, None)
                self._refresh = new_r
                self._rt_hash = hashlib.sha256(self._refresh.encode("utf-8")).hexdigest()
        ttl = float(min(int(data.get("expires_in", 3600)), 3500))
        SpotifyBackedCatalog._access_by_refresh_hash[self._rt_hash] = (self._access, now + ttl)
        # #region agent log
        _agent_debug_log("access_token_refreshed", "H1", {"rt_prefix": self._rt_hash[:12], "ttl_s": ttl})
        # #endregion
        return self._access

    def _search_get(self, q: str, offset: int, page_limit: int) -> httpx.Response:
        lim = int(page_limit)
        off = int(offset)
        smaller = max(1, min(5, lim))
        trials: list[dict[str, Any]] = []
        if self._market:
            trials.append({"q": q, "type": "track", "limit": lim, "offset": off, "market": self._market})
        trials.append({"q": q, "type": "track", "limit": lim, "offset": off})
        trials.append({"q": q, "type": "track", "limit": lim, "offset": off, "market": "US"})
        if lim > 5:
            trials.append({"q": q, "type": "track", "limit": smaller, "offset": off, "market": "US"})
        seen: set[tuple[tuple[str, Any], ...]] = set()
        last: httpx.Response | None = None
        for p in trials:
            sig = tuple(sorted(p.items()))
            if sig in seen:
                continue
            seen.add(sig)
            last = self._request("GET", "/search", params=p)
            if last.status_code != 400:
                break
        assert last is not None
        return last

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
                SpotifyBackedCatalog._access_by_refresh_hash.pop(self._rt_hash, None)
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
        target = min(max(int(limit), 1), 300)
        query_variants = (
            _normalize_spotify_search_query(query),
            _strip_noisy_spotify_query_chars(query),
            "genre:pop",
        )
        seen_q: set[str] = set()
        picked: list[SpotifyTrack] = []
        for q in query_variants:
            if q in seen_q:
                continue
            seen_q.add(q)
            picked = []
            seen_ids: set[str] = set()
            offset = 0
            pages = 0
            while len(picked) < target and pages < 24 and offset <= _SPOTIFY_SEARCH_MAX_OFFSET:
                remaining = target - len(picked)
                page_limit = max(1, min(_SPOTIFY_SEARCH_MAX_LIMIT, remaining))
                r = self._search_get(q, offset, page_limit)
                if r.status_code == 400:
                    log_provider_reason(
                        "spotify",
                        "search_bad_request",
                        f"q={q[:60]!r} body={r.text[:180]!r}",
                    )
                    break
                if r.status_code >= 400:
                    r.raise_for_status()
                tracks = (r.json().get("tracks") or {}).get("items", [])
                if not tracks:
                    break
                for t in tracks:
                    st = _track_json_to_stub(t)
                    if st and st.spotify_track_id not in seen_ids:
                        seen_ids.add(st.spotify_track_id)
                        picked.append(st)
                offset += len(tracks)
                pages += 1
            if picked:
                break
        if len(picked) < target and picked:
            seed = ",".join(picked[i].spotify_track_id for i in range(min(5, len(picked))))
            need = target - len(picked)
            rec_params: dict[str, Any] = {
                "seed_tracks": seed,
                "limit": max(1, min(100, need)),
            }
            if self._market:
                rec_params["market"] = self._market
            r2 = self._request("GET", "/recommendations", params=rec_params)
            if r2.status_code == 400 and rec_params.get("market") not in (None, "US"):
                r2 = self._request("GET", "/recommendations", params={**rec_params, "market": "US"})
            if r2.status_code == 400 and self._market is None:
                r2 = self._request("GET", "/recommendations", params={**rec_params, "market": "US"})
            if r2.status_code == 200:
                have = {t.spotify_track_id for t in picked}
                for t in r2.json().get("tracks", []) or []:
                    st = _track_json_to_stub(t)
                    if st and st.spotify_track_id not in have:
                        have.add(st.spotify_track_id)
                        picked.append(st)
                        if len(picked) >= target:
                            break
        return picked[:target]

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

    @staticmethod
    def _dedupe_track_ids_preserve_order(ids: list[str]) -> list[str]:
        out: list[str] = []
        seen: set[str] = set()
        for tid in ids:
            s = (tid or "").strip()
            if not s or s in seen:
                continue
            seen.add(s)
            out.append(s)
        return out

    def _fetch_several_tracks_into(self, batch: list[str], tracks_meta: dict[str, dict]) -> None:
        """Fill tracks_meta from GET /tracks; on failure split batch or fetch single track."""
        if not batch:
            return
        if len(batch) > _SPOTIFY_TRACKS_API_MAX_IDS:
            for i in range(0, len(batch), _SPOTIFY_TRACKS_API_MAX_IDS):
                self._fetch_several_tracks_into(batch[i : i + _SPOTIFY_TRACKS_API_MAX_IDS], tracks_meta)
            return

        # Runtime evidence (docker logs): GET /tracks?ids=... often returns 403 for this app/token,
        # while GET /tracks/{id} succeeds. Batching would triple-fail per node and explode latency.
        if len(batch) > 1:
            for tid in batch:
                self._fetch_several_tracks_into([tid], tracks_meta)
            return

        tid = batch[0]
        # Single id: use GET /tracks/{id} only (GET /tracks?ids=… returns 403 for many tokens).
        single_trials: list[dict[str, Any] | None] = [{"market": "US"}]
        if self._market and str(self._market).upper() != "US":
            single_trials.append({"market": self._market})
        single_trials.append(None)
        seen_single: set[frozenset[tuple[str, Any]]] = set()
        for extra in single_trials:
            key = frozenset(extra.items()) if extra else frozenset()
            if key in seen_single:
                continue
            seen_single.add(key)
            r = self._request("GET", f"/tracks/{tid}", params=extra)
            if r.status_code < 400:
                t = r.json()
                if t and t.get("id"):
                    tracks_meta[t["id"]] = t
                return
        log_provider_reason("spotify", "track_fetch_failed", f"id={tid} status=403/400")

    def _hydrate_tracks(self, ids: list[str]) -> list[SpotifyTrack]:
        clean = self._dedupe_track_ids_preserve_order(ids)
        if not clean:
            return []
        tracks_meta: dict[str, dict] = {}
        self._fetch_several_tracks_into(clean, tracks_meta)
        features: dict[str, dict] = {}
        if not SpotifyBackedCatalog._audio_features_skip:
            for i in range(0, len(clean), 100):
                batch = clean[i : i + 100]
                r = self._request("GET", "/audio-features", params={"ids": ",".join(batch)})
                if r.status_code == 403:
                    SpotifyBackedCatalog._audio_features_skip = True
                    # #region agent log
                    _agent_debug_log(
                        "audio_features_403_process_skip",
                        "H2",
                        {"batch_size": len(batch)},
                    )
                    # #endregion
                    log_provider_reason(
                        "spotify",
                        "audio_features_forbidden",
                        "403 from /audio-features — skipping for this process (token lacks access or quota)",
                    )
                    break
                if r.status_code >= 400:
                    continue
                for feat in r.json().get("audio_features", []) or []:
                    if feat and feat.get("id"):
                        features[feat["id"]] = feat
        out: list[SpotifyTrack] = []
        for tid in clean:
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

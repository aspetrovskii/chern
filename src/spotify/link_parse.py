"""Parse Spotify open URLs and spotify: URIs into (kind, id)."""

from __future__ import annotations

import re
from typing import Literal

SpotifyResourceKind = Literal["playlist", "album", "artist", "track"]

_URI_RE = re.compile(r"^spotify:(playlist|album|artist|track):([A-Za-z0-9]+)\s*$", re.IGNORECASE)

# open.spotify.com/.../type/id — optional intl-xx segment, id before query string
_OPEN_RE = re.compile(
    r"https?://(?:open|play)\.spotify\.com/(?:intl-[a-z]{2}/)?(playlist|album|artist|track)/([A-Za-z0-9]+)",
    re.IGNORECASE,
)


def parse_spotify_link(raw: str) -> tuple[SpotifyResourceKind, str] | None:
    """Return resource kind and id, or None if the string is not a Spotify link/URI."""
    s = (raw or "").strip()
    if not s:
        return None
    m = _URI_RE.match(s)
    if m:
        return m.group(1).lower(), m.group(2)  # type: ignore[return-value]
    m = _OPEN_RE.search(s)
    if m:
        return m.group(1).lower(), m.group(2)  # type: ignore[return-value]
    return None


def normalize_playlist_id(raw: str | None) -> str | None:
    if raw is None:
        return None
    s = raw.strip()
    if not s:
        return None
    p = parse_spotify_link(s)
    if p:
        k, sid = p
        if k != "playlist":
            raise ValueError(f"expected_playlist_link_got_{k}")
        return sid
    return s


def normalize_album_id(raw: str | None) -> str | None:
    if raw is None:
        return None
    s = raw.strip()
    if not s:
        return None
    p = parse_spotify_link(s)
    if p:
        k, sid = p
        if k != "album":
            raise ValueError(f"expected_album_link_got_{k}")
        return sid
    return s


def normalize_artist_id(raw: str | None) -> str | None:
    if raw is None:
        return None
    s = raw.strip()
    if not s:
        return None
    p = parse_spotify_link(s)
    if p:
        k, sid = p
        if k != "artist":
            raise ValueError(f"expected_artist_link_got_{k}")
        return sid
    return s


def normalize_track_id_token(raw: str) -> str | None:
    s = raw.strip()
    if not s:
        return None
    p = parse_spotify_link(s)
    if p:
        k, sid = p
        if k != "track":
            raise ValueError(f"expected_track_link_got_{k}")
        return sid
    return s

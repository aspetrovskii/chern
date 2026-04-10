from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SpotifyTrack:
    spotify_track_id: str
    name: str
    artist: str
    uri: str
    energy: float
    valence: float
    tempo: float


class SpotifyClientMock:
    def __init__(self) -> None:
        self._tracks = [
            SpotifyTrack("sp_t001", "Neon Drift", "Aurora Echo", "spotify:track:sp_t001", 0.42, 0.62, 104),
            SpotifyTrack("sp_t002", "Steel Horizon", "Pulse Harbor", "spotify:track:sp_t002", 0.86, 0.49, 146),
            SpotifyTrack("sp_t003", "Low Tide Lights", "Mellow Unit", "spotify:track:sp_t003", 0.33, 0.54, 92),
            SpotifyTrack("sp_t004", "Golden Rush", "Kite Parade", "spotify:track:sp_t004", 0.77, 0.73, 128),
            SpotifyTrack("sp_t005", "Velvet Snow", "Cinder Bloom", "spotify:track:sp_t005", 0.28, 0.40, 84),
            SpotifyTrack("sp_t006", "Crowd Ignition", "Razor District", "spotify:track:sp_t006", 0.93, 0.55, 164),
        ]

    def get_user_playlists(self) -> list[dict]:
        return [{"id": "pl_mock_1", "name": "Mock Favorites"}, {"id": "pl_mock_2", "name": "Mock Workout"}]

    def get_tracks_for_playlist(self, playlist_id: str) -> list[SpotifyTrack]:
        if playlist_id:
            return self._tracks
        return self._tracks[:4]

    def discovery_tracks(self, query: str, limit: int = 100) -> list[SpotifyTrack]:
        _ = query
        return (self._tracks * ((limit // len(self._tracks)) + 1))[: min(limit, 120)]

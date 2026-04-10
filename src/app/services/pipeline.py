from __future__ import annotations

from dataclasses import dataclass

from llm.models import ChatContext, TrackInput
from llm.service import LLMService
from optimizer.service import CandidateTrack, optimize_order
from spotify.client import SpotifyTrack


@dataclass
class PipelineResult:
    ordered_track_ids: list[str]
    structured_intent: dict


class ConcertPipeline:
    def __init__(self, spotify: object, llm: LLMService) -> None:
        self.spotify = spotify
        self.llm = llm

    def run(
        self,
        *,
        user_text: str,
        chat_id: int,
        mode: str,
        source_playlist_id: str | None,
        target_count: int,
    ) -> PipelineResult:
        intent = self.llm.parse_user_intent(
            text=user_text,
            chat_context=ChatContext(
                chat_id=str(chat_id),
                message_id=f"chat-{chat_id}",
                request_id=f"req-{chat_id}",
                mode=mode,
                target_track_count=target_count,
                ui_language="ru",
            ),
        )

        candidates = self._collect_candidates(mode, source_playlist_id, user_text, target_count)
        scored: list[CandidateTrack] = []
        for track in candidates:
            tags = self.llm.tag_track(
                TrackInput(
                    spotify_track_id=track.spotify_track_id,
                    raw_metadata={"name": track.name, "artist": track.artist, "uri": track.uri},
                    audio_features={"energy": track.energy, "valence": track.valence, "tempo": track.tempo},
                )
            )
            boost = tags.mood_scores.energy * 0.05
            scored.append(
                CandidateTrack(
                    spotify_track_id=track.spotify_track_id,
                    energy=min(1.0, track.energy + boost),
                    valence=track.valence,
                    tempo=track.tempo,
                    artist=track.artist,
                )
            )
        ordered = optimize_order(scored)[:target_count]
        return PipelineResult(ordered_track_ids=ordered, structured_intent=intent.to_dict())

    def _collect_candidates(
        self,
        mode: str,
        source_playlist_id: str | None,
        user_text: str,
        target_count: int,
    ) -> list[SpotifyTrack]:
        pool_target = min(max(target_count * 5, 20), 120)
        if mode == "fixed_pool":
            return self.spotify.get_tracks_for_playlist(source_playlist_id or "")[:pool_target]
        return self.spotify.discovery_tracks(user_text, limit=pool_target)

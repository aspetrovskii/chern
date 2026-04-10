from __future__ import annotations

import math
import random
from dataclasses import dataclass


@dataclass(frozen=True)
class CandidateTrack:
    spotify_track_id: str
    energy: float
    valence: float
    tempo: float
    artist: str


def _pair_distance(a: CandidateTrack, b: CandidateTrack) -> float:
    tempo_penalty = min(1.0, abs(a.tempo - b.tempo) / 80.0)
    return (abs(a.energy - b.energy) * 0.5) + (abs(a.valence - b.valence) * 0.3) + (tempo_penalty * 0.2)


def _arc_target(index: int, total: int) -> float:
    if total <= 1:
        return 0.5
    x = index / (total - 1)
    return 0.25 + (0.7 * math.sin(x * math.pi))


def _score(order: list[CandidateTrack]) -> float:
    if not order:
        return 0.0
    transitions = 0.0
    arc_penalty = 0.0
    diversity = 0.0
    for i, track in enumerate(order):
        arc_penalty += abs(track.energy - _arc_target(i, len(order)))
        if i < len(order) - 1:
            transitions += _pair_distance(track, order[i + 1])
        if i > 0 and order[i - 1].artist == track.artist:
            diversity += 0.75
    return (transitions * 0.55) + (arc_penalty * 0.30) + (diversity * 0.15)


def optimize_order(candidates: list[CandidateTrack], seed: int = 42) -> list[str]:
    if len(candidates) <= 2:
        return [t.spotify_track_id for t in candidates]
    random.seed(seed)
    current = list(candidates)
    current_score = _score(current)
    best = list(current)
    best_score = current_score
    temperature = 1.0
    for _ in range(1000):
        i, j = random.sample(range(len(current)), 2)
        proposed = list(current)
        proposed[i], proposed[j] = proposed[j], proposed[i]
        proposed_score = _score(proposed)
        delta = proposed_score - current_score
        if delta < 0 or math.exp(-delta / max(temperature, 0.01)) > random.random():
            current = proposed
            current_score = proposed_score
            if current_score < best_score:
                best = list(current)
                best_score = current_score
        temperature *= 0.996
    return [t.spotify_track_id for t in best]

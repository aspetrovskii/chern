from __future__ import annotations

from collections.abc import Iterable


GENRE_SYNONYMS = {
    "hip hop": "hip-hop",
    "hiphop": "hip-hop",
    "r&b": "rnb",
    "drum and bass": "dnb",
    "drum & bass": "dnb",
}


def canonicalize_genres(items: Iterable[str]) -> list[str]:
    out: list[str] = []
    seen = set()
    for item in items:
        token = item.strip().lower()
        if not token:
            continue
        token = GENRE_SYNONYMS.get(token, token)
        if token in seen:
            continue
        out.append(token)
        seen.add(token)
    return out


def detect_language(text: str) -> str:
    stripped = text.strip()
    if not stripped:
        return "ru"
    if any("\u4e00" <= ch <= "\u9fff" for ch in stripped):
        return "zh"
    if any(ch in "çğıöşüİÇĞİÖŞÜ" for ch in stripped):
        return "tr"
    if any("а" <= ch.lower() <= "я" for ch in stripped):
        return "ru"
    return "en"

from __future__ import annotations

import secrets
import threading
import time

_lock = threading.Lock()
_store: dict[str, float] = {}


def issue_state(ttl_seconds: float = 600.0) -> str:
    s = secrets.token_urlsafe(32)
    deadline = time.monotonic() + ttl_seconds
    with _lock:
        _store[s] = deadline
    return s


def consume_state(state: str) -> bool:
    with _lock:
        deadline = _store.pop(state, None)
    if deadline is None:
        return False
    return time.monotonic() <= deadline


def clear_all_for_tests() -> None:
    with _lock:
        _store.clear()

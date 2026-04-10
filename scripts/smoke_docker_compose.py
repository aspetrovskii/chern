"""HTTP smoke against stack from `docker compose up` (api :8000, web :8080)."""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request


def main() -> None:
    try:
        with urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=10) as r:
            assert r.status == 200
            body = json.loads(r.read().decode())
            assert body.get("status") == "ok"
        with urllib.request.urlopen("http://127.0.0.1:8080/", timeout=10) as r:
            assert r.status == 200
            html = r.read().decode().lower()
            assert "app" in html or "conce" in html or "script" in html
    except (urllib.error.URLError, TimeoutError, AssertionError) as e:
        print(f"smoke_docker_compose: FAIL ({e})", file=sys.stderr)
        sys.exit(1)
    print("smoke_docker_compose: OK")


if __name__ == "__main__":
    main()

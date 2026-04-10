from spotify.link_parse import (
    normalize_playlist_id,
    normalize_track_id_token,
    parse_spotify_link,
)


def test_parse_open_url_with_query() -> None:
    u = "https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6?si=abc"
    assert parse_spotify_link(u) == ("track", "6rqhFgbbKwnb9MLmUQDhG6")


def test_parse_intl_path() -> None:
    u = "https://open.spotify.com/intl-ru/playlist/37i9dQZF1DXcBWIGoYBM5M"
    assert parse_spotify_link(u) == ("playlist", "37i9dQZF1DXcBWIGoYBM5M")


def test_parse_spotify_uri() -> None:
    assert parse_spotify_link("spotify:artist:4Z8W4fKeB5YxbusRsdQVPb") == ("artist", "4Z8W4fKeB5YxbusRsdQVPb")


def test_parse_bare_id_returns_none() -> None:
    assert parse_spotify_link("37i9dQZF1DXcBWIGoYBM5M") is None


def test_normalize_playlist_bare_id() -> None:
    assert normalize_playlist_id("37i9dQZF1DXcBWIGoYBM5M") == "37i9dQZF1DXcBWIGoYBM5M"


def test_normalize_track_token_bare_id() -> None:
    assert normalize_track_id_token("6rqhFgbbKwnb9MLmUQDhG6") == "6rqhFgbbKwnb9MLmUQDhG6"

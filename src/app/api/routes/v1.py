from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas import (
    AuthCallbackRequest,
    AuthCallbackResponse,
    AuthLoginResponse,
    ChatCreateRequest,
    ChatDTO,
    ChatPatchRequest,
    ChatPoolDTO,
    ConcertDTO,
    ConcertMetaPatchRequest,
    ConcertPatchOrderRequest,
    GenerateResponse,
    MessageCreateRequest,
    MessageDTO,
    PoolCreateRequest,
    PoolDeleteRequest,
    ProvidersStatusDTO,
    SpotifyPlaylistDTO,
    TokenDTO,
    TrackMetaDTO,
    TracksResolveRequest,
    TracksResolveResponse,
    UserDTO,
)
from app.core.config import settings
from app.core.oauth_state import consume_state, issue_state
from app.core.security import create_access_token, decrypt_secret, encrypt_secret
from app.db.models import Chat, ChatPoolTrack, Concert, Message, User
from app.db.session import get_db
from app.services.providers import get_concert_pipeline
from llm.cache import SQLiteTrackCache
from spotify.factory import build_spotify_catalog
from spotify.oauth import exchange_code_for_tokens, fetch_spotify_me, spotify_authorize_url

router = APIRouter(prefix=settings.api_prefix)


@router.get("/providers/status", response_model=ProvidersStatusDTO)
def providers_status() -> ProvidersStatusDTO:
    from llm.transport_factory import build_llm_transport

    _, llm_label = build_llm_transport(settings)
    safe_llm: Literal["yandex", "mock"] = "yandex" if llm_label == "yandex" else "mock"
    yandex_ok = settings.yandex_credentials_ready()
    spotify_oauth_ok = settings.spotify_oauth_configured()
    if settings.provider_mode == "mock" or safe_llm == "mock" or not spotify_oauth_ok:
        ui_data_source: Literal["real_providers", "mock_fallback"] = "mock_fallback"
    else:
        ui_data_source = "real_providers"
    return ProvidersStatusDTO(
        provider_mode=settings.provider_mode,
        llm=safe_llm,
        yandex_configured=yandex_ok,
        spotify_oauth_configured=spotify_oauth_ok,
        ui_data_source=ui_data_source,
    )


@router.get("/auth/spotify/login", response_model=AuthLoginResponse)
def auth_spotify_login() -> AuthLoginResponse:
    if settings.spotify_oauth_configured():
        state = issue_state()
        auth_url = spotify_authorize_url(
            client_id=settings.spotify_client_id,
            redirect_uri=settings.spotify_redirect_uri,
            scopes=settings.spotify_scopes,
            state=state,
        )
    else:
        state = "mock-state"
        auth_url = "https://accounts.spotify.com/authorize?client_id=mock&response_type=code"
    return AuthLoginResponse(auth_url=auth_url, state=state, provider_mode=settings.provider_mode)


def _auth_spotify_callback_handler(payload: AuthCallbackRequest, db: Session) -> AuthCallbackResponse:
    if settings.spotify_oauth_configured():
        if not consume_state(payload.state):
            raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")
        try:
            tokens = exchange_code_for_tokens(settings, payload.code)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=400, detail="Spotify token exchange failed") from exc
        access = tokens["access_token"]
        refresh = tokens.get("refresh_token") or ""
        if not refresh:
            raise HTTPException(status_code=400, detail="Spotify did not return refresh_token")
        try:
            profile = fetch_spotify_me(settings, access)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=400, detail="Spotify profile request failed") from exc
        spotify_user_id = profile["id"]
        email = profile.get("email") or f"{spotify_user_id}@users.spotify.com"
        refresh_enc = encrypt_secret(refresh)
    else:
        if payload.state != "mock-state":
            raise HTTPException(status_code=400, detail="Invalid OAuth state")
        spotify_user_id = f"mock_{payload.code}"
        email = f"{spotify_user_id}@mock.local"
        refresh_enc = encrypt_secret("mock-refresh-token")

    user = db.scalar(select(User).where(User.spotify_user_id == spotify_user_id))
    if not user:
        user = User(
            spotify_user_id=spotify_user_id,
            email=email,
            refresh_token_encrypted=refresh_enc,
        )
        db.add(user)
    else:
        user.email = email
        user.refresh_token_encrypted = refresh_enc
    db.commit()
    db.refresh(user)
    token = create_access_token(str(user.id))
    return AuthCallbackResponse(
        token=TokenDTO(access_token=token),
        user=UserDTO(id=user.id, spotify_user_id=user.spotify_user_id, email=user.email),
    )


@router.post("/auth/spotify/callback", response_model=AuthCallbackResponse)
def auth_spotify_callback_post(payload: AuthCallbackRequest, db: Session = Depends(get_db)) -> AuthCallbackResponse:
    return _auth_spotify_callback_handler(payload, db)


@router.get("/auth/spotify/callback")
def auth_spotify_callback_get(request: Request, db: Session = Depends(get_db)) -> RedirectResponse:
    code = request.query_params.get("code") or ""
    state = request.query_params.get("state") or ""
    base = settings.frontend_public_url.rstrip("/")
    if not code or not state:
        return RedirectResponse(f"{base}/#/auth?error=oauth_missing")
    try:
        out = _auth_spotify_callback_handler(AuthCallbackRequest(code=code, state=state), db)
    except HTTPException:
        return RedirectResponse(f"{base}/#/auth?error=oauth_failed")
    token = out.token.access_token
    return RedirectResponse(f"{base}/#/auth?access_token={quote(token)}")


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout() -> None:
    return None


@router.get("/me", response_model=UserDTO)
def me(current_user: User = Depends(get_current_user)) -> UserDTO:
    return UserDTO(id=current_user.id, spotify_user_id=current_user.spotify_user_id, email=current_user.email)


@router.get("/chats", response_model=list[ChatDTO])
def list_chats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[ChatDTO]:
    chats = db.scalars(select(Chat).where(Chat.user_id == current_user.id).order_by(Chat.updated_at.desc())).all()
    return [
        ChatDTO(
            id=chat.id,
            title=chat.title,
            mode=chat.mode,
            source_spotify_playlist_id=chat.source_spotify_playlist_id,
            target_track_count=chat.target_track_count,
            created_at=chat.created_at,
            updated_at=chat.updated_at,
        )
        for chat in chats
    ]


@router.post("/chats", response_model=ChatDTO)
def create_chat(
    payload: ChatCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatDTO:
    chat = Chat(user_id=current_user.id, title=payload.title)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return ChatDTO(
        id=chat.id,
        title=chat.title,
        mode=chat.mode,
        source_spotify_playlist_id=chat.source_spotify_playlist_id,
        target_track_count=chat.target_track_count,
        created_at=chat.created_at,
        updated_at=chat.updated_at,
    )


@router.delete("/chats/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat(chat_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> None:
    chat = _get_chat_or_404(db, current_user.id, chat_id)
    db.delete(chat)
    db.commit()


@router.get("/chats/{chat_id}", response_model=ChatDTO)
def get_chat(chat_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ChatDTO:
    chat = _get_chat_or_404(db, current_user.id, chat_id)
    return ChatDTO(
        id=chat.id,
        title=chat.title,
        mode=chat.mode,
        source_spotify_playlist_id=chat.source_spotify_playlist_id,
        target_track_count=chat.target_track_count,
        created_at=chat.created_at,
        updated_at=chat.updated_at,
    )


@router.patch("/chats/{chat_id}", response_model=ChatDTO)
def patch_chat(
    chat_id: int,
    payload: ChatPatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatDTO:
    chat = _get_chat_or_404(db, current_user.id, chat_id)
    if payload.title is not None:
        chat.title = payload.title.strip()[:120]
    if payload.mode is not None:
        chat.mode = payload.mode
    if payload.target_track_count is not None:
        chat.target_track_count = payload.target_track_count
    if payload.source_spotify_playlist_id is not None:
        chat.source_spotify_playlist_id = payload.source_spotify_playlist_id
    chat.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(chat)
    return ChatDTO(
        id=chat.id,
        title=chat.title,
        mode=chat.mode,
        source_spotify_playlist_id=chat.source_spotify_playlist_id,
        target_track_count=chat.target_track_count,
        created_at=chat.created_at,
        updated_at=chat.updated_at,
    )


@router.post("/chats/{chat_id}/messages", response_model=GenerateResponse, status_code=status.HTTP_202_ACCEPTED)
def post_message(
    chat_id: int,
    payload: MessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GenerateResponse:
    chat = _get_chat_or_404(db, current_user.id, chat_id)

    user_message = Message(chat_id=chat.id, role="user", content=payload.content, status="queued")
    db.add(user_message)
    db.flush()

    pool_rows = db.scalars(select(ChatPoolTrack).where(ChatPoolTrack.chat_id == chat.id)).all()
    pool_ids = [r.spotify_track_id for r in pool_rows]
    if chat.mode == "fixed_pool":
        has_playlist = bool((chat.source_spotify_playlist_id or "").strip())
        if not pool_ids and not has_playlist:
            raise HTTPException(
                status_code=400,
                detail="fixed_pool: add tracks to the chat pool (Spotify playlist link is optional)",
            )

    pipeline = get_concert_pipeline(settings, current_user)
    result = pipeline.run(
        user_text=payload.content,
        chat_id=chat.id,
        mode=chat.mode,
        source_playlist_id=chat.source_spotify_playlist_id,
        pool_track_ids=pool_ids,
        target_count=chat.target_track_count,
    )

    user_message.status = "done"
    user_message.structured_intent = result.structured_intent

    assistant_message = Message(
        chat_id=chat.id,
        role="assistant",
        content=f"Concert generated with {len(result.ordered_track_ids)} tracks",
        status="done",
    )
    db.add(assistant_message)
    db.flush()

    next_version = (db.scalar(select(func.max(Concert.version)).where(Concert.chat_id == chat.id)) or 0) + 1
    concert = Concert(
        chat_id=chat.id,
        message_id=assistant_message.id,
        version=next_version,
        ordered_track_ids=result.ordered_track_ids,
        order_source="optimizer",
    )
    db.add(concert)
    chat.updated_at = datetime.now(UTC)
    db.commit()
    return GenerateResponse(message_id=user_message.id, status="done")


@router.get("/chats/{chat_id}/messages", response_model=list[MessageDTO])
def list_messages(
    chat_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[MessageDTO]:
    _get_chat_or_404(db, current_user.id, chat_id)
    rows = db.scalars(select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at.asc())).all()
    return [
        MessageDTO(
            id=m.id,
            chat_id=m.chat_id,
            role=m.role,
            content=m.content,
            status=m.status,
            structured_intent=m.structured_intent,
            error=m.error,
            created_at=m.created_at,
        )
        for m in rows
    ]


@router.get("/chats/{chat_id}/messages/{msg_id}", response_model=MessageDTO)
def get_message(
    chat_id: int,
    msg_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageDTO:
    _get_chat_or_404(db, current_user.id, chat_id)
    message = db.scalar(select(Message).where(Message.id == msg_id, Message.chat_id == chat_id))
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return MessageDTO(
        id=message.id,
        chat_id=message.chat_id,
        role=message.role,
        content=message.content,
        status=message.status,
        structured_intent=message.structured_intent,
        error=message.error,
        created_at=message.created_at,
    )


@router.get("/chats/{chat_id}/concert", response_model=ConcertDTO)
def get_concert(chat_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ConcertDTO:
    _get_chat_or_404(db, current_user.id, chat_id)
    concert = db.scalar(select(Concert).where(Concert.chat_id == chat_id).order_by(Concert.version.desc()))
    if not concert:
        raise HTTPException(status_code=404, detail="Concert not found")
    return _concert_dto(concert)


@router.patch("/chats/{chat_id}/concert/order", response_model=ConcertDTO)
def patch_concert_order(
    chat_id: int,
    payload: ConcertPatchOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConcertDTO:
    _get_chat_or_404(db, current_user.id, chat_id)
    if payload.version is not None:
        concert = db.scalar(select(Concert).where(Concert.chat_id == chat_id, Concert.version == payload.version))
    else:
        concert = db.scalar(select(Concert).where(Concert.chat_id == chat_id).order_by(Concert.version.desc()))
    if not concert:
        raise HTTPException(status_code=404, detail="Concert not found")
    expected = list(concert.ordered_track_ids)
    received = payload.ordered_track_ids
    if len(received) != len(expected) or set(received) != set(expected):
        raise HTTPException(status_code=400, detail="ordered_track_ids must be full permutation of current concert")
    concert.ordered_track_ids = received
    concert.order_source = "user"
    concert.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(concert)
    return _concert_dto(concert)


@router.patch("/chats/{chat_id}/concert/meta", response_model=ConcertDTO)
def patch_concert_meta(
    chat_id: int,
    payload: ConcertMetaPatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConcertDTO:
    _get_chat_or_404(db, current_user.id, chat_id)
    concert = db.scalar(select(Concert).where(Concert.chat_id == chat_id, Concert.version == payload.version))
    if not concert:
        raise HTTPException(status_code=404, detail="Concert not found")
    trimmed = payload.label.strip()
    concert.label = trimmed[:80] if trimmed else None
    concert.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(concert)
    return _concert_dto(concert)


@router.get("/chats/{chat_id}/concerts", response_model=list[ConcertDTO])
def list_concerts(chat_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[ConcertDTO]:
    _get_chat_or_404(db, current_user.id, chat_id)
    concerts = db.scalars(select(Concert).where(Concert.chat_id == chat_id).order_by(Concert.version.desc())).all()
    return [_concert_dto(c) for c in concerts]


@router.get("/chats/{chat_id}/pool", response_model=ChatPoolDTO)
def get_chat_pool(
    chat_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> ChatPoolDTO:
    _get_chat_or_404(db, current_user.id, chat_id)
    rows = db.scalars(select(ChatPoolTrack).where(ChatPoolTrack.chat_id == chat_id)).all()
    return ChatPoolDTO(track_ids=[r.spotify_track_id for r in rows])


@router.post("/tracks/resolve", response_model=TracksResolveResponse)
def resolve_tracks(
    payload: TracksResolveRequest,
    current_user: User = Depends(get_current_user),
) -> TracksResolveResponse:
    ids = list(dict.fromkeys(payload.track_ids))[:200]
    cache = SQLiteTrackCache(settings.llm_cache_db_path)
    by_id: dict[str, TrackMetaDTO] = {}
    for tid in ids:
        row = cache.get_display_bundle(tid)
        if row:
            by_id[tid] = TrackMetaDTO(**row)
    missing = [tid for tid in ids if tid not in by_id]
    if missing:
        refresh_plain = decrypt_secret(current_user.refresh_token_encrypted)
        spotify, _ = build_spotify_catalog(settings, refresh_plain)
        for t in spotify.get_tracks_by_ids(missing):
            by_id[t.spotify_track_id] = TrackMetaDTO(
                id=t.spotify_track_id,
                title=t.name,
                artist=t.artist,
                uri=t.uri,
                energy=t.energy,
                valence=t.valence,
                tempo=t.tempo,
                tags=[],
            )
    tracks: list[TrackMetaDTO] = []
    for tid in ids:
        if tid in by_id:
            tracks.append(by_id[tid])
        else:
            tracks.append(
                TrackMetaDTO(
                    id=tid,
                    title=tid,
                    artist="?",
                    uri=f"spotify:track:{tid}",
                    energy=0.5,
                    valence=0.5,
                    tempo=120.0,
                    tags=[],
                )
            )
    return TracksResolveResponse(tracks=tracks)


@router.get("/spotify/playlists", response_model=list[SpotifyPlaylistDTO])
def spotify_playlists(current_user: User = Depends(get_current_user)) -> list[SpotifyPlaylistDTO]:
    refresh_plain = decrypt_secret(current_user.refresh_token_encrypted)
    spotify, _ = build_spotify_catalog(settings, refresh_plain)
    return [SpotifyPlaylistDTO(id=p["id"], name=p["name"]) for p in spotify.get_user_playlists()]


@router.post("/chats/{chat_id}/pool", status_code=status.HTTP_204_NO_CONTENT)
def add_pool_tracks(
    chat_id: int,
    payload: PoolCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    chat = _get_chat_or_404(db, current_user.id, chat_id)
    source_ids = list(payload.track_ids)
    refresh_plain = decrypt_secret(current_user.refresh_token_encrypted)
    spotify, _ = build_spotify_catalog(settings, refresh_plain)
    if payload.playlist_id:
        source_ids.extend([t.spotify_track_id for t in spotify.get_tracks_for_playlist(payload.playlist_id)])
    if payload.album_id:
        source_ids.extend([t.spotify_track_id for t in spotify.get_tracks_for_album(payload.album_id)])
    if payload.artist_id:
        source_ids.extend([t.spotify_track_id for t in spotify.get_tracks_for_artist(payload.artist_id)])
    source_ids = list(dict.fromkeys(source_ids))[:300]
    for track_id in source_ids:
        exists = db.scalar(
            select(ChatPoolTrack).where(ChatPoolTrack.chat_id == chat.id, ChatPoolTrack.spotify_track_id == track_id)
        )
        if exists:
            continue
        db.add(ChatPoolTrack(chat_id=chat.id, spotify_track_id=track_id, added_via="manual"))
    chat.updated_at = datetime.now(UTC)
    db.commit()
    return None


@router.delete("/chats/{chat_id}/pool/tracks", status_code=status.HTTP_204_NO_CONTENT)
def delete_pool_tracks(
    chat_id: int,
    payload: PoolDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    _get_chat_or_404(db, current_user.id, chat_id)
    rows = db.scalars(
        select(ChatPoolTrack).where(ChatPoolTrack.chat_id == chat_id, ChatPoolTrack.spotify_track_id.in_(payload.track_ids))
    ).all()
    for row in rows:
        db.delete(row)
    db.commit()
    return None


@router.post("/chats/{chat_id}/generate", response_model=GenerateResponse, status_code=status.HTTP_202_ACCEPTED)
def regenerate_chat(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GenerateResponse:
    return post_message(
        chat_id=chat_id,
        payload=MessageCreateRequest(content="regenerate concert"),
        db=db,
        current_user=current_user,
    )


def _concert_dto(concert: Concert) -> ConcertDTO:
    return ConcertDTO(
        id=concert.id,
        chat_id=concert.chat_id,
        version=concert.version,
        ordered_track_ids=concert.ordered_track_ids,
        spotify_playlist_id=concert.spotify_playlist_id,
        order_source=concert.order_source,
        label=concert.label,
        created_at=concert.created_at,
        updated_at=concert.updated_at,
    )


def _get_chat_or_404(db: Session, user_id: int, chat_id: int) -> Chat:
    chat = db.scalar(select(Chat).where(Chat.id == chat_id, Chat.user_id == user_id))
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../lib/api/http";
import { t, type Locale } from "../../lib/i18n";
import type { ChatMode, ChatRecord } from "../../lib/concertMvp";
import {
  apiListSpotifyPlaylists,
  apiPatchChatMode,
  apiPatchSourceSpotifyPlaylist,
  apiPostLoadPoolFromLinkedPlaylist,
  apiPostPoolFromAlbumId,
  apiPostPoolFromArtistId,
  apiPostPoolFromPlaylistId,
  apiPostPoolFromSpotifyUrl,
  apiPostPoolFromTrackIds,
  apiPostRebuildConcertFromPool,
  apiDeletePoolTrack,
  getCachedTrack,
  type SpotifyPlaylistRow,
} from "../../lib/pendingBackendApi";
import { parseCommaSeparatedTrackIds } from "../../lib/poolEditorMvp";
import styles from "./ChatPage.module.css";

type ChevronDir = "left" | "right";

function SidebarChevron({ direction }: { direction: ChevronDir }) {
  return (
    <span className={styles["btn-icon__glyph"]} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" xmlns="http://www.w3.org/2000/svg">
        {direction === "left" ? (
          <path
            d="M15 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </span>
  );
}

type PoolSidebarProps = {
  locale: Locale;
  activeChat: ChatRecord | null;
  onRefresh: () => void;
};

export function PoolSidebar({ locale, activeChat, onRefresh }: PoolSidebarProps) {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [spotifyLinkInput, setSpotifyLinkInput] = useState("");
  const [playlistIdInput, setPlaylistIdInput] = useState("");
  const [albumIdInput, setAlbumIdInput] = useState("");
  const [artistIdInput, setArtistIdInput] = useState("");
  const [trackIdsInput, setTrackIdsInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylistRow[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await apiListSpotifyPlaylists();
        setPlaylists(rows);
      } catch {
        setPlaylists([]);
      }
    })();
  }, [activeChat?.id]);

  const clearFeedbackSoon = useCallback(() => {
    window.setTimeout(() => setFeedback(null), 4000);
  }, []);

  const run = useCallback(
    (fn: () => Promise<void>) => {
      if (!activeChat) return;
      setBusy(true);
      void (async () => {
        try {
          await fn();
        } finally {
          setBusy(false);
        }
      })();
    },
    [activeChat]
  );

  if (!activeChat) {
    return (
      <aside
        className={`${styles.sidebar} ${open ? styles["sidebar-open"] : styles["sidebar-closed"]}`}
      >
        <div className={styles["sidebar-top"]}>
          <button
            type="button"
            className={`${styles.btn} ${styles["btn-icon"]}`}
            aria-label={open ? t(locale, "pool_hide") : t(locale, "pool_show")}
            onClick={() => setOpen((v) => !v)}
            title={open ? t(locale, "pool_hide") : t(locale, "pool_show")}
          >
            <SidebarChevron direction={open ? "right" : "left"} />
          </button>
          {open && <strong>{t(locale, "pool_panel_title")}</strong>}
        </div>
        {open && <p className={styles.muted}>{t(locale, "pool_no_chat")}</p>}
      </aside>
    );
  }

  const chatId = activeChat.id;

  return (
    <aside className={`${styles.sidebar} ${open ? styles["sidebar-open"] : styles["sidebar-closed"]}`}>
      <div className={styles["sidebar-top"]}>
        <button
          type="button"
          className={`${styles.btn} ${styles["btn-icon"]}`}
          aria-label={open ? t(locale, "pool_hide") : t(locale, "pool_show")}
          onClick={() => setOpen((v) => !v)}
          title={open ? t(locale, "pool_hide") : t(locale, "pool_show")}
        >
          <SidebarChevron direction={open ? "right" : "left"} />
        </button>
        {open && <strong>{t(locale, "pool_panel_title")}</strong>}
      </div>

      {open && (
        <div className={`${styles["chat-groups"]} ${styles["pool-scroll"]}`}>
          {busy && <p className={styles.muted}>{t(locale, "pool_busy")}</p>}
          {feedback && <p className={styles.muted}>{feedback}</p>}

          <label className={styles["pool-field-label"]} htmlFor={`pool-mode-${chatId}`}>
            {t(locale, "pool_mode")}
          </label>
          <select
            id={`pool-mode-${chatId}`}
            className={styles["pool-select"]}
            value={activeChat.mode}
            disabled={busy}
            onChange={(e) => {
              const mode = e.target.value as ChatMode;
              run(async () => {
                await apiPatchChatMode(chatId, mode);
                onRefresh();
              });
            }}
          >
            <option value="fixed_pool">{t(locale, "pool_mode_fixed")}</option>
            <option value="spotify_discovery">{t(locale, "pool_mode_discovery")}</option>
          </select>

          <label className={styles["pool-field-label"]} htmlFor={`pool-src-${chatId}`}>
            {t(locale, "pool_source")}
          </label>
          <select
            id={`pool-src-${chatId}`}
            className={styles["pool-select"]}
            value={activeChat.sourceSpotifyPlaylistId ?? ""}
            disabled={busy}
            onChange={(e) => {
              const v = e.target.value || null;
              run(async () => {
                await apiPatchSourceSpotifyPlaylist(chatId, v);
                onRefresh();
              });
            }}
          >
            <option value="">—</option>
            {playlists.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={`${styles.btn} ${styles["pool-action-btn"]}`}
            disabled={busy || !activeChat.sourceSpotifyPlaylistId}
            onClick={() => {
              run(async () => {
                const next = await apiPostLoadPoolFromLinkedPlaylist(chatId);
                if (!next) {
                  setFeedback(t(locale, "pool_unknown"));
                  clearFeedbackSoon();
                }
                onRefresh();
              });
            }}
          >
            {t(locale, "pool_load_from_source")}
          </button>

          <p className={styles["pool-section-title"]}>{t(locale, "pool_add_by_link")}</p>
          <div className={styles["pool-id-row"]}>
            <input
              type="text"
              className={styles["pool-text-input"]}
              value={spotifyLinkInput}
              onChange={(e) => setSpotifyLinkInput(e.target.value)}
              placeholder={t(locale, "pool_ph_link")}
              aria-label={t(locale, "pool_add_by_link")}
            />
            <button
              type="button"
              className={styles.btn}
              disabled={busy}
              onClick={() => {
                const raw = spotifyLinkInput.trim();
                if (!raw) {
                  setFeedback(t(locale, "pool_unknown"));
                  clearFeedbackSoon();
                  return;
                }
                setBusy(true);
                void (async () => {
                  try {
                    await apiPostPoolFromSpotifyUrl(chatId, raw);
                    setSpotifyLinkInput("");
                    onRefresh();
                  } catch (e) {
                    const msg = e instanceof ApiError ? e.message : t(locale, "pool_unknown");
                    setFeedback(msg);
                    clearFeedbackSoon();
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              {t(locale, "pool_add_link")}
            </button>
          </div>

          <p className={styles["pool-section-title"]}>{t(locale, "pool_add_by_id")}</p>
          <p className={styles["pool-demo-hint"]}>{t(locale, "pool_demo_hint")}</p>

          <div className={styles["pool-id-row"]}>
            <input
              type="text"
              className={styles["pool-text-input"]}
              value={playlistIdInput}
              onChange={(e) => setPlaylistIdInput(e.target.value)}
              placeholder={t(locale, "pool_ph_playlist")}
              aria-label={t(locale, "pool_id_playlist")}
            />
            <button
              type="button"
              className={styles.btn}
              disabled={busy}
              onClick={() => {
                const id = playlistIdInput.trim();
                if (!id) {
                  setFeedback(t(locale, "pool_unknown"));
                  clearFeedbackSoon();
                  return;
                }
                run(async () => {
                  await apiPostPoolFromPlaylistId(chatId, id);
                  onRefresh();
                });
                setPlaylistIdInput("");
              }}
            >
              {t(locale, "pool_add_playlist")}
            </button>
          </div>

          <div className={styles["pool-id-row"]}>
            <input
              type="text"
              className={styles["pool-text-input"]}
              value={albumIdInput}
              onChange={(e) => setAlbumIdInput(e.target.value)}
              placeholder={t(locale, "pool_ph_album")}
              aria-label={t(locale, "pool_id_album")}
            />
            <button
              type="button"
              className={styles.btn}
              disabled={busy}
              onClick={() => {
                const id = albumIdInput.trim();
                if (!id) {
                  setFeedback(t(locale, "pool_unknown"));
                  clearFeedbackSoon();
                  return;
                }
                run(async () => {
                  await apiPostPoolFromAlbumId(chatId, id);
                  onRefresh();
                });
                setAlbumIdInput("");
              }}
            >
              {t(locale, "pool_add_album")}
            </button>
          </div>

          <div className={styles["pool-id-row"]}>
            <input
              type="text"
              className={styles["pool-text-input"]}
              value={artistIdInput}
              onChange={(e) => setArtistIdInput(e.target.value)}
              placeholder={t(locale, "pool_ph_artist")}
              aria-label={t(locale, "pool_id_artist")}
            />
            <button
              type="button"
              className={styles.btn}
              disabled={busy}
              onClick={() => {
                const id = artistIdInput.trim();
                if (!id) {
                  setFeedback(t(locale, "pool_unknown"));
                  clearFeedbackSoon();
                  return;
                }
                run(async () => {
                  await apiPostPoolFromArtistId(chatId, id);
                  onRefresh();
                });
                setArtistIdInput("");
              }}
            >
              {t(locale, "pool_add_artist")}
            </button>
          </div>

          <div className={styles["pool-id-row"]}>
            <input
              type="text"
              className={styles["pool-text-input"]}
              value={trackIdsInput}
              onChange={(e) => setTrackIdsInput(e.target.value)}
              placeholder={t(locale, "pool_ph_tracks")}
              aria-label={t(locale, "pool_id_tracks")}
            />
            <button
              type="button"
              className={styles.btn}
              disabled={busy}
              onClick={() => {
                const ids = parseCommaSeparatedTrackIds(trackIdsInput);
                if (ids.length === 0) {
                  setFeedback(t(locale, "pool_unknown"));
                  clearFeedbackSoon();
                  return;
                }
                run(async () => {
                  await apiPostPoolFromTrackIds(chatId, ids);
                  onRefresh();
                });
                setTrackIdsInput("");
              }}
            >
              {t(locale, "pool_add_tracks")}
            </button>
          </div>

          {activeChat.mode === "fixed_pool" && activeChat.poolTrackIds.length === 0 && (
            <p className={styles["pool-warn"]}>{t(locale, "pool_empty_fixed")}</p>
          )}

          <button
            type="button"
            className={`${styles.btn} ${styles["pool-rebuild-btn"]}`}
            disabled={busy || (activeChat.mode === "fixed_pool" && activeChat.poolTrackIds.length === 0)}
            onClick={() => {
              run(async () => {
                const next = await apiPostRebuildConcertFromPool(chatId, locale);
                if (!next) {
                  setFeedback(t(locale, "pool_unknown"));
                  clearFeedbackSoon();
                }
                onRefresh();
              });
            }}
          >
            {t(locale, "pool_rebuild")}
          </button>

          <p className={styles["pool-section-title"]}>
            {t(locale, "pool_tracks_in_pool")} ({activeChat.poolTrackIds.length})
          </p>
          <ul className={styles["chat-list"]}>
            {activeChat.poolTrackIds.map((tid: string) => {
              const tr = getCachedTrack(tid);
              return (
                <li key={tid}>
                  <div className={styles["chat-item-row"]}>
                    <span className={styles["pool-track-line"]}>
                      {tr ? `${tr.title} — ${tr.artist}` : tid}
                    </span>
                    <div className={styles["delete-item-wrap"]}>
                      <button
                        type="button"
                        className={styles["delete-item-btn"]}
                        aria-label="Remove from pool"
                        onClick={() => {
                          run(async () => {
                            await apiDeletePoolTrack(chatId, tid);
                            onRefresh();
                          });
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}

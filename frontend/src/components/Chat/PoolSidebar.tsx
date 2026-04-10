import { useCallback, useEffect, useMemo, useState } from "react";
import { t, type Locale } from "../../lib/i18n";
import {
  addTracksToPool,
  getTrackById,
  loadPoolFromSourcePlaylist,
  rebuildConcertFromPool,
  removePoolTrack,
  setChatMode,
  setSourceSpotifyPlaylist,
  type ChatMode,
  type ChatRecord,
} from "../../lib/concertMvp";
import {
  fetchPlaylistSummaries,
  fetchPlaylistTrackIds,
  getTrackIdsForAlbum,
  getTrackIdsForArtist,
  parseCommaSeparatedTrackIds,
} from "../../lib/poolEditorMvp";
import headerStyles from "../Header/Header.module.css";
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

type PoolDropdownOption = { value: string; label: string };

type PoolDropdownProps = {
  ariaLabel: string;
  value: string;
  options: PoolDropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

function PoolGlassDropdown({ ariaLabel, value, options, onChange, disabled }: PoolDropdownProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = () => close();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const current = options.find((o) => o.value === value) ?? options[0];
  const shown = current?.label ?? "";

  return (
    <div
      className={`${headerStyles["lang-dropdown"]} ${headerStyles["lang-dropdown--block"]} ${open ? headerStyles["lang-dropdown--open"] : ""}`}
      data-dropdown=""
    >
      <button
        type="button"
        disabled={disabled}
        className={`${headerStyles["nav-btn"]} ${headerStyles["nav-btn--pool"]}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className={`${headerStyles["nav-text"]} ${styles["pool-dd-text"]}`}>{shown}</span>
        <span className={headerStyles["nav-btn__chev"]} aria-hidden="true">
          ▾
        </span>
      </button>
      <div className={headerStyles["lang-dropdown__panel"]} role="listbox" aria-label={ariaLabel}>
        {options.map((opt) => (
          <button
            key={opt.value || "__none"}
            type="button"
            role="option"
            aria-selected={opt.value === value}
            className={`${headerStyles["lang-option"]}${opt.value === value ? ` ${headerStyles["lang-option--active"]}` : ""}`}
            onClick={() => {
              onChange(opt.value);
              close();
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
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
  const [playlistIdInput, setPlaylistIdInput] = useState("");
  const [albumIdInput, setAlbumIdInput] = useState("");
  const [artistIdInput, setArtistIdInput] = useState("");
  const [trackIdsInput, setTrackIdsInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [playlistSummaries, setPlaylistSummaries] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchPlaylistSummaries().then((rows) => {
      if (!cancelled) setPlaylistSummaries(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const modeOptions: PoolDropdownOption[] = useMemo(
    () => [
      { value: "fixed_pool", label: t(locale, "pool_mode_fixed") },
      { value: "spotify_discovery", label: t(locale, "pool_mode_discovery") },
    ],
    [locale]
  );

  const playlistOptions: PoolDropdownOption[] = useMemo(() => {
    const none = { value: "", label: "—" };
    return [none, ...playlistSummaries.map((p) => ({ value: p.id, label: p.name }))];
  }, [playlistSummaries]);

  const clearFeedbackSoon = useCallback(() => {
    window.setTimeout(() => setFeedback(null), 4000);
  }, []);

  const run = useCallback(
    (fn: () => void) => {
      if (!activeChat) return;
      setBusy(true);
      try {
        fn();
      } finally {
        setBusy(false);
      }
    },
    [activeChat]
  );

  const runAsync = useCallback(
    async (fn: () => Promise<void>) => {
      if (!activeChat) return;
      setBusy(true);
      try {
        await fn();
      } finally {
        setBusy(false);
      }
    },
    [activeChat]
  );

  if (!activeChat) {
    return (
      <aside
        className={`${styles.sidebar} ${styles["sidebar--pool"]} ${open ? styles["sidebar-open"] : styles["sidebar-closed"]}`}
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
    <aside
      className={`${styles.sidebar} ${styles["sidebar--pool"]} ${open ? styles["sidebar-open"] : styles["sidebar-closed"]}`}
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

      {open && (
        <div className={styles["pool-sidebar-inner"]}>
          <div className={styles["pool-sidebar-fixed"]}>
          {busy && <p className={styles.muted}>{t(locale, "pool_busy")}</p>}
          {feedback && <p className={styles.muted}>{feedback}</p>}

          <span className={styles["pool-field-label"]}>{t(locale, "pool_mode")}</span>
          <PoolGlassDropdown
            ariaLabel={t(locale, "pool_mode")}
            value={activeChat.mode}
            options={modeOptions}
            disabled={busy}
            onChange={(v) => {
              const mode = v as ChatMode;
              run(() => {
                setChatMode(chatId, mode);
                onRefresh();
              });
            }}
          />

          <span className={styles["pool-field-label"]}>{t(locale, "pool_source")}</span>
          <PoolGlassDropdown
            ariaLabel={t(locale, "pool_source")}
            value={activeChat.sourceSpotifyPlaylistId ?? ""}
            options={playlistOptions}
            disabled={busy}
            onChange={(v) => {
              const pl = v || null;
              run(() => {
                setSourceSpotifyPlaylist(chatId, pl);
                onRefresh();
              });
            }}
          />

          <button
            type="button"
            className={`${styles.btn} ${styles["pool-action-btn"]}`}
            disabled={busy || !activeChat.sourceSpotifyPlaylistId}
            onClick={() => {
              void runAsync(async () => {
                const next = await loadPoolFromSourcePlaylist(chatId);
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
                void runAsync(async () => {
                  const id = playlistIdInput.trim();
                  const ids = await fetchPlaylistTrackIds(id);
                  if (ids.length === 0) {
                    setFeedback(t(locale, "pool_unknown"));
                    clearFeedbackSoon();
                    return;
                  }
                  addTracksToPool(chatId, ids);
                  onRefresh();
                  setPlaylistIdInput("");
                });
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
                const ids = getTrackIdsForAlbum(id);
                if (ids.length === 0) {
                  setFeedback(t(locale, "pool_unknown"));
                  clearFeedbackSoon();
                  return;
                }
                run(() => {
                  addTracksToPool(chatId, ids);
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
                const ids = getTrackIdsForArtist(id);
                if (ids.length === 0) {
                  setFeedback(t(locale, "pool_unknown"));
                  clearFeedbackSoon();
                  return;
                }
                run(() => {
                  addTracksToPool(chatId, ids);
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
                const known = ids.filter((id) => getTrackById(id));
                if (known.length === 0) {
                  setFeedback(t(locale, "pool_unknown"));
                  clearFeedbackSoon();
                  return;
                }
                run(() => {
                  addTracksToPool(chatId, known);
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
              run(() => {
                const next = rebuildConcertFromPool(chatId, locale);
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
          </div>

          <div className={styles["pool-sidebar-scroll"]}>
          <p className={styles["pool-section-title"]}>
            {t(locale, "pool_tracks_in_pool")} ({activeChat.poolTrackIds.length})
          </p>
          <ul className={styles["chat-list"]}>
            {activeChat.poolTrackIds.map((tid) => {
              const tr = getTrackById(tid);
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
                          run(() => {
                            removePoolTrack(chatId, tid);
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
        </div>
      )}
    </aside>
  );
}

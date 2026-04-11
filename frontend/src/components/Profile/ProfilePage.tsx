import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getAccountCreatedAtIso } from "../../lib/accountCreated";
import { getSessionUser, logoutUser } from "../../lib/auth";
import {
  getCachedOrFetchIp,
  isCurrentDeviceSession,
  listDeviceSessions,
  prefetchClientIp,
  removeDeviceSession,
  renameDeviceSession,
  touchDeviceSession,
} from "../../lib/deviceSessions";
import { estimateWorldRankByPrompts, estimateWorldRankByTokens } from "../../lib/demoRanks";
import {
  clearAllActivity,
  getHeatmapColumns,
  getProfileStats,
  getPromptSeriesLastDays,
  getTokenSeriesLastDays,
} from "../../lib/profileActivity";
import { addSpotifyAccount, listSpotifyAccounts, removeSpotifyAccount } from "../../lib/spotifyAccounts";
import {
  clearStoredAvatar,
  getInitials,
  getProfileTextFields,
  getStoredAvatarDataUrl,
  setProfileTextFields,
  setStoredAvatarFromFile,
} from "../../lib/userProfile";
import { t, type Locale } from "../../lib/i18n";
import { UserAvatar } from "../Header/UserAvatar";
import layoutStyles from "../MainLayout.module.css";
import styles from "./ProfilePage.module.css";

const HEATMAP_WEEKS = 42;
const CHART_DAYS = 14;

const HEAT_LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: styles["profile-heatmap__cell--0"],
  1: styles["profile-heatmap__cell--1"],
  2: styles["profile-heatmap__cell--2"],
  3: styles["profile-heatmap__cell--3"],
  4: styles["profile-heatmap__cell--4"],
};

type ProfileTab = "overview" | "settings";

type ProfilePageProps = {
  locale: Locale;
};

function formatCompactTokens(n: number): string {
  const v = Math.round(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1_000)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

function TokenSpendLine({
  series,
  maxVal,
}: {
  series: { date: string; tokens: number }[];
  maxVal: number;
}) {
  const vb = { w: 400, h: 100, padX: 4, padY: 6 };
  const innerW = vb.w - 2 * vb.padX;
  const innerH = vb.h - 2 * vb.padY;
  const max = Math.max(1, maxVal);
  const n = series.length;

  const pts = useMemo(() => {
    return series.map((s, i) => {
      const x = vb.padX + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const y = vb.padY + innerH - (s.tokens / max) * innerH;
      return { x, y, date: s.date, tokens: s.tokens };
    });
  }, [series, n, max, innerW, innerH, vb.padX, vb.padY]);

  const lineD =
    n === 0
      ? ""
      : n === 1
        ? `M ${vb.padX} ${pts[0].y.toFixed(1)} L ${(vb.padX + innerW).toFixed(1)} ${pts[0].y.toFixed(1)}`
        : pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const yBase = vb.padY + innerH;
  const areaD =
    n === 0
      ? ""
      : n === 1
        ? `M ${vb.padX} ${yBase.toFixed(1)} L ${(vb.padX + innerW).toFixed(1)} ${yBase.toFixed(1)} L ${(vb.padX + innerW).toFixed(1)} ${pts[0].y.toFixed(1)} L ${vb.padX} ${pts[0].y.toFixed(1)} Z`
        : `M ${pts[0].x.toFixed(1)} ${yBase.toFixed(1)} ` +
          pts.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") +
          ` L ${pts[pts.length - 1].x.toFixed(1)} ${yBase.toFixed(1)} Z`;

  if (n === 0) return null;

  return (
    <svg
      className={styles["token-chart__svg"]}
      viewBox={`0 0 ${vb.w} ${vb.h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={areaD} className={styles["token-chart__area"]} />
      <path
        d={lineD}
        fill="none"
        className={styles["token-chart__line"]}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProfilePage({ locale }: ProfilePageProps) {
  const session = getSessionUser();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [, bump] = useState(0);
  const [tab, setTab] = useState<ProfileTab>("overview");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [dnInput, setDnInput] = useState("");
  const [bioInput, setBioInput] = useState("");

  const refresh = useCallback(() => bump((n) => n + 1), []);

  useEffect(() => {
    const p = getProfileTextFields();
    setDnInput(p.displayName);
    setBioInput(p.bio);
  }, [tab, bump]);

  useEffect(() => {
    if (!session) return;
    prefetchClientIp();
    let cancelled = false;
    void getCachedOrFetchIp().then((ip) => {
      if (!cancelled) touchDeviceSession(session.email, ip);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.email]);

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  const loc = locale === "ru" ? "ru-RU" : locale;
  const avatarUrl = getStoredAvatarDataUrl();
  const profileText = getProfileTextFields();
  const initials = getInitials(session.login, session.email);
  const stats = getProfileStats();
  const columns = getHeatmapColumns(HEATMAP_WEEKS);
  const series = getPromptSeriesLastDays(CHART_DAYS);
  const tokenSeries = getTokenSeriesLastDays(CHART_DAYS);
  const maxPrompts = Math.max(1, ...series.map((s) => s.prompts));
  const maxTokens = Math.max(1, ...tokenSeries.map((s) => s.tokens));
  const rankPrompts = estimateWorldRankByPrompts(session.email, stats.totalPrompts);
  const rankTokens = estimateWorldRankByTokens(session.email, stats.totalTokens);
  const createdIso = getAccountCreatedAtIso(session.email);
  const deviceSessions = listDeviceSessions(session.email);
  const spotifyAccounts = listSpotifyAccounts(session.email);

  const dateFmt = (iso: string) => {
    try {
      const [y, m, d] = iso.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString(loc, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const createdFmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(loc, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const dayLabel = (iso: string) => {
    try {
      const [y, m, d] = iso.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString(loc, { weekday: "narrow" });
    } catch {
      return "";
    }
  };

  const headline = profileText.displayName.trim() || session.login;

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploadErr(null);
    const r = await setStoredAvatarFromFile(f);
    if (!r.ok) {
      const key =
        r.error === "type"
          ? "profile_err_avatar_type"
          : r.error === "size"
            ? "profile_err_avatar_size"
            : "profile_err_avatar_read";
      setUploadErr(t(locale, key));
      return;
    }
    refresh();
  };

  const onRemoveAvatar = () => {
    clearStoredAvatar();
    setUploadErr(null);
    refresh();
  };

  const onClearActivity = () => {
    if (window.confirm(t(locale, "profile_settings_clear_confirm"))) {
      clearAllActivity();
      refresh();
    }
  };

  const onSaveProfileText = () => {
    setProfileTextFields({ displayName: dnInput, bio: bioInput });
    refresh();
  };

  const onStartRenameSession = (id: string, currentName: string) => {
    setEditingSessionId(id);
    setRenameDraft(currentName);
  };

  const onSaveRenameSession = (id: string) => {
    renameDeviceSession(session.email, id, renameDraft);
    setEditingSessionId(null);
    refresh();
  };

  const onRemoveSession = (id: string) => {
    if (!window.confirm(t(locale, "profile_session_remove_confirm"))) return;
    const isCurrent = removeDeviceSession(session.email, id);
    refresh();
    if (isCurrent) {
      logoutUser();
      navigate("/auth", { replace: true });
    }
  };

  const sessionDisplayName = (raw: string) =>
    raw.trim() ? raw.trim() : t(locale, "profile_session_this_device");

  const titleId = "profile-activity-title";
  const chartTitleId = "profile-chart-title";
  const tokensTitleId = "profile-tokens-title";

  return (
    <div className={styles["profile-page"]}>
      <h1 className={`${layoutStyles["page-title"]} ${layoutStyles["page-title--compact"]}`}>
        {t(locale, "page_profile_title")}
      </h1>

      <div
        className={styles["profile-tabs"]}
        role="tablist"
        aria-label={t(locale, "page_profile_title")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "overview"}
          aria-controls="profile-panel-overview"
          id="profile-tab-overview"
          className={styles["profile-tabs__btn"]}
          onClick={() => setTab("overview")}
        >
          {t(locale, "profile_tab_overview")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "settings"}
          aria-controls="profile-panel-settings"
          id="profile-tab-settings"
          className={styles["profile-tabs__btn"]}
          onClick={() => setTab("settings")}
        >
          {t(locale, "profile_tab_settings")}
        </button>
      </div>

      {tab === "overview" ? (
        <div
          id="profile-panel-overview"
          role="tabpanel"
          aria-labelledby="profile-tab-overview"
          className={styles["profile-panel"]}
        >
          <div className={styles["profile-overview-meta"]}>
            <UserAvatar key={avatarUrl ? "1" : "0"} login={session.login} email={session.email} size={40} />
            <div className={styles["profile-overview-meta__text"]}>
              <span className={styles["profile-overview-meta__login"]}>{headline}</span>
              <span className={styles["profile-overview-meta__email"]}>{session.email}</span>
              {profileText.bio.trim() ? (
                <p className={styles["profile-overview-meta__bio"]}>{profileText.bio.trim()}</p>
              ) : null}
            </div>
          </div>

          <div className={`${styles["profile-stats-grid"]} ${styles["profile-stats-grid--8"]}`}>
            <div className={styles["profile-stat"]}>
              <div className={styles["profile-stat__value"]}>{stats.totalPrompts}</div>
              <div className={styles["profile-stat__label"]}>{t(locale, "profile_stat_prompts")}</div>
            </div>
            <div className={styles["profile-stat"]}>
              <div className={styles["profile-stat__value"]}>
                #{rankPrompts.toLocaleString(loc)}
              </div>
              <div className={styles["profile-stat__label"]}>{t(locale, "profile_stat_rank_prompts")}</div>
            </div>
            <div className={styles["profile-stat"]}>
              <div className={styles["profile-stat__value"]}>{stats.activeDays}</div>
              <div className={styles["profile-stat__label"]}>{t(locale, "profile_stat_active_days")}</div>
            </div>
            <div className={styles["profile-stat"]}>
              <div className={styles["profile-stat__value"]}>{stats.streak}</div>
              <div className={styles["profile-stat__label"]}>{t(locale, "profile_stat_streak")}</div>
            </div>
            <div className={styles["profile-stat"]}>
              <div className={styles["profile-stat__value"]}>
                {stats.firstActiveDate ? dateFmt(stats.firstActiveDate) : t(locale, "profile_stat_since_empty")}
              </div>
              <div className={styles["profile-stat__label"]}>{t(locale, "profile_stat_since")}</div>
            </div>
            <div className={styles["profile-stat"]}>
              <div className={styles["profile-stat__value"]}>
                {stats.totalTokens.toLocaleString(loc)}
              </div>
              <div className={styles["profile-stat__label"]}>{t(locale, "profile_stat_tokens")}</div>
            </div>
            <div className={styles["profile-stat"]}>
              <div className={styles["profile-stat__value"]}>#{rankTokens.toLocaleString(loc)}</div>
              <div className={styles["profile-stat__label"]}>{t(locale, "profile_stat_rank_tokens")}</div>
            </div>
            <div className={styles["profile-stat"]}>
              <div className={styles["profile-stat__value"]}>
                {createdIso ? createdFmt(createdIso) : t(locale, "profile_stat_since_empty")}
              </div>
              <div className={styles["profile-stat__label"]}>{t(locale, "profile_stat_created")}</div>
            </div>
          </div>
          <p className={styles["profile-demo-hint"]}>{t(locale, "profile_rank_demo_note")}</p>

          <section className={styles["profile-heatmap-full-card"]} aria-labelledby={titleId}>
            <div className={styles["profile-activity__head"]}>
              <h2 id={titleId} className={styles["profile-card__title"]}>
                {t(locale, "profile_activity_title")}
              </h2>
            </div>
            <p className={styles["profile-activity__sub"]}>{t(locale, "profile_activity_subtitle")}</p>
            <div className={styles["profile-heatmap-full-wrap"]}>
              <div
                className={`${styles["profile-heatmap-grid"]} ${styles["profile-heatmap-grid--fixed"]}`}
                role="img"
                aria-label={t(locale, "profile_activity_title")}
              >
                {columns.flatMap((col) =>
                  [0, 1, 2, 3, 4, 5, 6].map((day) => {
                    const cell = col[day];
                    const cls = cell.future
                      ? styles["profile-heatmap__cell--future"]
                      : HEAT_LEVEL_CLASS[cell.level];
                    return (
                      <div
                        key={cell.date}
                        className={`${styles["profile-heatmap__cell"]} ${styles["profile-heatmap__cell--fixed"]} ${cls}`}
                        title={cell.future ? "" : cell.date}
                      />
                    );
                  })
                )}
              </div>
            </div>
            <div className={styles["profile-heatmap__legend"]}>
              <span>{t(locale, "profile_activity_less")}</span>
              <div className={styles["profile-heatmap__legend-scale"]} aria-hidden>
                {([0, 1, 2, 3, 4] as const).map((level) => (
                  <div
                    key={level}
                    className={`${styles["profile-heatmap__legend-cell"]} ${HEAT_LEVEL_CLASS[level]}`}
                  />
                ))}
              </div>
              <span>{t(locale, "profile_activity_more")}</span>
            </div>
          </section>

          <div className={styles["profile-activity-split"]}>
            <section className={styles["profile-chart-card"]} aria-labelledby={chartTitleId}>
              <h2 id={chartTitleId} className={styles["profile-card__title"]}>
                {t(locale, "profile_chart_title")}
              </h2>
              <div className={styles["profile-chart"]} role="img" aria-label={t(locale, "profile_chart_title")}>
                <div className={styles["profile-chart__y"]} aria-hidden>
                  <span>{maxPrompts}</span>
                  {maxPrompts > 1 ? <span>{Math.round(maxPrompts / 2)}</span> : null}
                  <span>0</span>
                </div>
                <div className={styles["profile-chart__plot"]}>
                  <div className={styles["profile-chart__bars"]}>
                    {series.map((s) => {
                      const h = Math.round((s.prompts / maxPrompts) * 100);
                      const pct = Math.max(h, s.prompts > 0 ? 12 : 4);
                      return (
                        <div key={s.date} className={styles["profile-chart__col"]} title={`${s.date}: ${s.prompts}`}>
                          <div className={styles["profile-chart__bar-wrap"]}>
                            <div className={styles["profile-chart__bar"]} style={{ height: `${pct}%` }} />
                          </div>
                          <span className={styles["profile-chart__tick"]}>{dayLabel(s.date)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className={styles["profile-token-card"]} aria-labelledby={tokensTitleId}>
              <h2 id={tokensTitleId} className={styles["profile-card__title"]}>
                {t(locale, "profile_tokens_title")}
              </h2>
              <p className={styles["profile-token-card__sub"]}>{t(locale, "profile_tokens_subtitle")}</p>
              <div className={styles["token-chart"]} role="img" aria-label={t(locale, "profile_tokens_title")}>
                <div className={styles["token-chart__y"]} aria-hidden>
                  <span>{formatCompactTokens(maxTokens)}</span>
                  {maxTokens > 1 ? <span>{formatCompactTokens(maxTokens / 2)}</span> : null}
                  <span>0</span>
                </div>
                <div className={styles["token-chart__plot"]}>
                  <div className={styles["token-chart__svg-wrap"]}>
                    <TokenSpendLine series={tokenSeries} maxVal={maxTokens} />
                  </div>
                  <div className={styles["token-chart__ticks"]}>
                    {tokenSeries.map((s) => (
                      <span key={s.date} className={styles["token-chart__tick"]} title={`${s.date}: ${s.tokens}`}>
                        {dayLabel(s.date)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div
          id="profile-panel-settings"
          role="tabpanel"
          aria-labelledby="profile-tab-settings"
          className={`${styles["profile-panel"]} ${styles["profile-panel--settings"]}`}
        >
          <section className={styles["profile-card"]} aria-labelledby="profile-settings-pref-h">
            <h2 id="profile-settings-pref-h" className={styles["profile-card__title"]}>
              {t(locale, "profile_settings_title")}
            </h2>
            <div className={styles["profile-settings-block"]}>
              <span className={styles["profile-field__label"]}>{t(locale, "profile_settings_lang")}</span>
              <p className={styles["profile-settings-hint"]}>{t(locale, "profile_settings_lang_hint")}</p>
            </div>
          </section>

          <section className={styles["profile-card"]} aria-labelledby="profile-display-h">
            <h2 id="profile-display-h" className={styles["profile-card__title"]}>
              {t(locale, "profile_display_section")}
            </h2>
            <div className={styles["profile-form-stack"]}>
              <label className={styles["profile-field"]}>
                <span className={styles["profile-field__label"]}>{t(locale, "profile_display_name_label")}</span>
                <input
                  className={styles["profile-input"]}
                  value={dnInput}
                  onChange={(e) => setDnInput(e.target.value)}
                  maxLength={80}
                  autoComplete="nickname"
                />
              </label>
              <label className={styles["profile-field"]}>
                <span className={styles["profile-field__label"]}>{t(locale, "profile_bio_label")}</span>
                <textarea
                  className={styles["profile-textarea"]}
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  maxLength={500}
                  rows={4}
                />
              </label>
              <button type="button" className={styles["profile-btn"]} onClick={onSaveProfileText}>
                {t(locale, "profile_display_save")}
              </button>
            </div>
          </section>

          <section className={styles["profile-card"]} aria-labelledby="profile-settings-avatar-h">
            <h2 id="profile-settings-avatar-h" className={styles["profile-card__title"]}>
              {t(locale, "profile_identity")}
            </h2>
            <div className={styles["profile-identity"]}>
              <div className={styles["profile-avatar-block"]}>
                {avatarUrl ? (
                  <img
                    className={styles["profile-avatar-large"]}
                    src={avatarUrl}
                    alt=""
                    width={88}
                    height={88}
                  />
                ) : (
                  <span
                    className={`${styles["profile-avatar-large"]} ${styles["profile-avatar-large--fallback"]}`}
                    aria-hidden
                  >
                    {initials}
                  </span>
                )}
                <div className={styles["profile-avatar-actions"]}>
                  <button type="button" className={styles["profile-btn"]} onClick={() => fileRef.current?.click()}>
                    {t(locale, "profile_avatar_upload")}
                  </button>
                  {avatarUrl ? (
                    <button
                      type="button"
                      className={`${styles["profile-btn"]} ${styles["profile-btn--danger"]}`}
                      onClick={onRemoveAvatar}
                    >
                      {t(locale, "profile_avatar_remove")}
                    </button>
                  ) : null}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className={styles["sr-only"]}
                  aria-label={t(locale, "profile_avatar_upload")}
                  onChange={onPickFile}
                />
                <p className={styles["profile-hint"]}>{t(locale, "profile_avatar_hint")}</p>
                {uploadErr ? (
                  <p className={styles["profile-err"]} role="alert">
                    {uploadErr}
                  </p>
                ) : null}
              </div>
              <div className={styles["profile-fields"]}>
                <div className={styles["profile-field"]}>
                  <span className={styles["profile-field__label"]}>{t(locale, "profile_login_label")}</span>
                  <span className={styles["profile-field__value"]}>{session.login}</span>
                </div>
                <div className={styles["profile-field"]}>
                  <span className={styles["profile-field__label"]}>{t(locale, "profile_email_label")}</span>
                  <span className={styles["profile-field__value"]}>{session.email}</span>
                </div>
              </div>
            </div>
          </section>

          <section
            className={`${styles["profile-card"]} ${styles["profile-card--wide"]}`}
            aria-labelledby="profile-sessions-h"
          >
            <h2 id="profile-sessions-h" className={styles["profile-card__title"]}>
              {t(locale, "profile_sessions_title")}
            </h2>
            <p className={styles["profile-settings-hint"]}>{t(locale, "profile_sessions_hint")}</p>
            <ul className={styles["profile-session-list"]}>
              {deviceSessions.map((s) => {
                const current = isCurrentDeviceSession(session.email, s.id);
                const showName = sessionDisplayName(s.name);
                return (
                  <li key={s.id} className={styles["profile-session-row"]}>
                    <div className={styles["profile-session-row__main"]}>
                      <div className={styles["profile-session-row__title"]}>
                        {editingSessionId === s.id ? (
                          <input
                            className={styles["profile-input"]}
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            aria-label={t(locale, "profile_session_rename")}
                          />
                        ) : (
                          <span>{showName}</span>
                        )}
                        {current ? (
                          <span className={styles["profile-session-badge"]}>{t(locale, "profile_session_current")}</span>
                        ) : null}
                      </div>
                      <div className={styles["profile-session-meta"]}>
                        <span>
                          {t(locale, "profile_session_device")}: {s.device}
                        </span>
                        <span>
                          {t(locale, "profile_session_ip")}: {s.ip || "—"}
                        </span>
                        <span>
                          {t(locale, "profile_session_last_seen")}:{" "}
                          {new Date(s.lastSeen).toLocaleString(loc, {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className={styles["profile-session-actions"]}>
                      {editingSessionId === s.id ? (
                        <>
                          <button
                            type="button"
                            className={styles["profile-btn"]}
                            onClick={() => onSaveRenameSession(s.id)}
                          >
                            {t(locale, "profile_session_save")}
                          </button>
                          <button
                            type="button"
                            className={styles["profile-btn"]}
                            onClick={() => setEditingSessionId(null)}
                          >
                            {t(locale, "profile_session_cancel")}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={styles["profile-btn"]}
                            onClick={() => onStartRenameSession(s.id, s.name)}
                          >
                            {t(locale, "profile_session_rename")}
                          </button>
                          <button
                            type="button"
                            className={`${styles["profile-btn"]} ${styles["profile-btn--danger"]}`}
                            onClick={() => onRemoveSession(s.id)}
                          >
                            {t(locale, "profile_session_remove")}
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section
            className={`${styles["profile-card"]} ${styles["profile-card--wide"]}`}
            aria-labelledby="profile-spotify-h"
          >
            <h2 id="profile-spotify-h" className={styles["profile-card__title"]}>
              {t(locale, "profile_spotify_title")}
            </h2>
            <p className={styles["profile-settings-hint"]}>{t(locale, "profile_spotify_hint")}</p>
            <ul className={styles["profile-spotify-list"]}>
              {spotifyAccounts.map((a) => (
                <li key={a.id} className={styles["profile-spotify-row"]}>
                  <span className={styles["profile-spotify-row__label"]}>{a.label}</span>
                  <span className={styles["profile-spotify-row__date"]}>
                    {new Date(a.connectedAt).toLocaleDateString(loc)}
                  </span>
                  <button
                    type="button"
                    className={`${styles["profile-btn"]} ${styles["profile-btn--danger"]}`}
                    onClick={() => {
                      removeSpotifyAccount(session.email, a.id);
                      refresh();
                    }}
                  >
                    {t(locale, "profile_spotify_remove")}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={styles["profile-btn"]}
              onClick={() => {
                addSpotifyAccount(session.email);
                refresh();
              }}
            >
              {t(locale, "profile_spotify_add")}
            </button>
          </section>

          <section className={styles["profile-card"]} aria-labelledby="profile-settings-data-h">
            <h2 id="profile-settings-data-h" className={styles["profile-card__title"]}>
              {t(locale, "profile_settings_data")}
            </h2>
            <p className={styles["profile-settings-hint"]}>{t(locale, "profile_activity_subtitle")}</p>
            <button type="button" className={`${styles["profile-btn"]} ${styles["profile-btn--danger"]}`} onClick={onClearActivity}>
              {t(locale, "profile_settings_clear_activity")}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

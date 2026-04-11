import { useCallback, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { getSessionUser } from "../../lib/auth";
import {
  clearAllActivity,
  getHeatmapColumns,
  getProfileStats,
  getPromptSeriesLastDays,
} from "../../lib/profileActivity";
import {
  clearStoredAvatar,
  getInitials,
  getStoredAvatarDataUrl,
  setStoredAvatarFromFile,
} from "../../lib/userProfile";
import { t, type Locale } from "../../lib/i18n";
import { UserAvatar } from "../Header/UserAvatar";
import layoutStyles from "../MainLayout.module.css";
import styles from "./ProfilePage.module.css";

const HEATMAP_WEEKS = 16;
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

export function ProfilePage({ locale }: ProfilePageProps) {
  const session = getSessionUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [, bump] = useState(0);
  const [tab, setTab] = useState<ProfileTab>("overview");

  const refresh = useCallback(() => bump((n) => n + 1), []);

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  const avatarUrl = getStoredAvatarDataUrl();
  const initials = getInitials(session.login, session.email);
  const stats = getProfileStats();
  const columns = getHeatmapColumns(HEATMAP_WEEKS);
  const series = getPromptSeriesLastDays(CHART_DAYS);
  const maxPrompts = Math.max(1, ...series.map((s) => s.prompts));

  const dateFmt = (iso: string) => {
    try {
      const [y, m, d] = iso.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString(locale === "ru" ? "ru-RU" : locale, {
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
      return dt.toLocaleDateString(locale === "ru" ? "ru-RU" : locale, { weekday: "narrow" });
    } catch {
      return "";
    }
  };

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

  const titleId = "profile-activity-title";
  const chartTitleId = "profile-chart-title";

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
            <UserAvatar key={avatarUrl ? "1" : "0"} login={session.login} email={session.email} size={36} />
            <div className={styles["profile-overview-meta__text"]}>
              <span className={styles["profile-overview-meta__login"]}>{session.login}</span>
              <span className={styles["profile-overview-meta__email"]}>{session.email}</span>
            </div>
          </div>

          <div className={styles["profile-stats-grid"]}>
            <div className={styles["profile-stat"]}>
              <div className={styles["profile-stat__value"]}>{stats.totalPrompts}</div>
              <div className={styles["profile-stat__label"]}>{t(locale, "profile_stat_prompts")}</div>
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
          </div>

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

            <section className={styles["profile-heatmap-card"]} aria-labelledby={titleId}>
              <div className={styles["profile-activity__head"]}>
                <h2 id={titleId} className={styles["profile-card__title"]}>
                  {t(locale, "profile_activity_title")}
                </h2>
              </div>
              <p className={styles["profile-activity__sub"]}>{t(locale, "profile_activity_subtitle")}</p>
              <div className={styles["profile-heatmap-wrap"]}>
                <div className={styles["profile-heatmap"]} role="img" aria-label={t(locale, "profile_activity_title")}>
                  {columns.map((col, ci) => (
                    <div key={ci} className={styles["profile-heatmap__col"]}>
                      {col.map((cell) => {
                        const cls = cell.future
                          ? styles["profile-heatmap__cell--future"]
                          : HEAT_LEVEL_CLASS[cell.level];
                        return (
                          <div
                            key={cell.date}
                            className={`${styles["profile-heatmap__cell"]} ${cls}`}
                            title={cell.future ? "" : cell.date}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles["profile-heatmap__legend"]}>
                <span>{t(locale, "profile_activity_less")}</span>
                <div className={styles["profile-heatmap__legend-scale"]} aria-hidden>
                  {([0, 1, 2, 3, 4] as const).map((level) => (
                    <div
                      key={level}
                      className={`${styles["profile-heatmap__cell"]} ${HEAT_LEVEL_CLASS[level]}`}
                    />
                  ))}
                </div>
                <span>{t(locale, "profile_activity_more")}</span>
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

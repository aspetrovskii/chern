import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { t, type Locale } from "../../lib/i18n";
import { getSessionUser, loginWithSpotify } from "../../lib/auth";
import neoStyles from "../NeoSurface.module.css";
import authStyles from "./AuthPage.module.css";
import layoutStyles from "../MainLayout.module.css";

type AuthPageProps = {
  locale: Locale;
};

export function AuthPage({ locale }: AuthPageProps) {
  const navigate = useNavigate();
  const errKey: string | null = null;

  useEffect(() => {
    if (getSessionUser()) navigate("/", { replace: true });
  }, [navigate]);

  const onSpotifyLogin = () => {
    loginWithSpotify();
    navigate("/", { replace: true });
    window.dispatchEvent(new Event("conce-auth-success"));
  };

  return (
    <div className={authStyles["auth-page-root"]}>
      <div className={`${authStyles["auth-page__shell"]} ${neoStyles["neo-surface"]}`}>
        <h1 className={`${layoutStyles["page-title"]} ${authStyles["auth-page__title"]}`}>
          {t(locale, "auth_title_login")}
        </h1>
        <p className={authStyles["auth-page__hint"]}>{t(locale, "auth_spotify_hint")}</p>
        <div className={authStyles["auth-page__err"]} role="alert" hidden={!errKey}>
          {errKey ? t(locale, errKey) : ""}
        </div>
        <div className={authStyles["auth-page__actions"]}>
          <button
            type="button"
            className={authStyles["auth-page__spotify-btn"]}
            onClick={onSpotifyLogin}
          >
            <span className={authStyles["auth-page__spotify-icon"]} aria-hidden="true">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="currentColor" />
                <path
                  fill="#0b0b0c"
                  d="M7.2 9.6a.9.9 0 0 1 .95-.84c2.8-.2 5.9.35 8.3 1.4a.9.9 0 1 1-.74 1.65c-2.1-.95-4.9-1.45-7.46-1.27A.9.9 0 0 1 7.2 9.6Zm1.05 3.1a.75.75 0 0 1 .81-.7c2.15-.14 4.46.25 6.2 1.05a.75.75 0 1 1-.62 1.36c-1.5-.68-3.54-1.03-5.48-.9a.75.75 0 0 1-.9-.81Zm.95 2.8a.65.65 0 0 1 .7-.62c1.65-.1 3.4.2 4.72.8a.65.65 0 1 1-.54 1.18c-1.1-.5-2.58-.76-3.98-.67a.65.65 0 0 1-.9-.69Z"
                />
              </svg>
            </span>
            <span>{t(locale, "auth_spotify_cta")}</span>
          </button>
        </div>
        <a className={authStyles["auth-page__back"]} href="#/">
          {t(locale, "auth_back_home")}
        </a>
      </div>
    </div>
  );
}


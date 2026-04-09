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
                <path
                  fill="currentColor"
                  d="M12 2.5A9.5 9.5 0 1 0 12 21.5A9.5 9.5 0 0 0 12 2.5ZM16.37 16.2A.75.75 0 0 1 15.34 16.45C13.53 15.34 11.24 15.09 8.53 15.69A.75.75 0 1 1 8.2 14.23C11.31 13.54 13.99 13.85 16.12 15.16C16.47 15.37 16.58 15.83 16.37 16.2ZM17.83 13A.93.93 0 0 1 16.56 13.3C14.49 12.04 11.33 11.68 8.87 12.34A.93.93 0 0 1 8.38 10.55C11.3 9.78 14.95 10.2 17.53 11.76C17.96 12.02 18.09 12.6 17.83 13ZM17.95 9.63C15.47 8.15 11.4 8.02 9.04 8.75A1.1 1.1 0 1 1 8.39 6.64C11.1 5.8 15.61 5.95 19.08 7.62A1.1 1.1 0 0 1 17.95 9.63Z"
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


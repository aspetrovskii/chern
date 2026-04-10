import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { t, type Locale } from "../../lib/i18n";
import { getSessionUser, loginWithSpotify } from "../../lib/auth";
import neoStyles from "../NeoSurface.module.css";
import authStyles from "./AuthPage.module.css";
import layoutStyles from "../MainLayout.module.css";
import spotifyLogo from "../../assets/spotify-logo.png";

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
              <img src={spotifyLogo} alt="" />
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


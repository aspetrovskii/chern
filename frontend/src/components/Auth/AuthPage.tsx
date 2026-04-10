import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { t, type Locale } from "../../lib/i18n";
import { getSessionUser, startSpotifyOAuthRedirect, syncSessionFromApiMe } from "../../lib/auth";
import { setAccessToken } from "../../lib/api/http";
import neoStyles from "../NeoSurface.module.css";
import authStyles from "./AuthPage.module.css";
import layoutStyles from "../MainLayout.module.css";
import spotifyLogo from "../../assets/spotify-logo.png";

type AuthPageProps = {
  locale: Locale;
};

export function AuthPage({ locale }: AuthPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [oauthFail, setOauthFail] = useState(false);
  const errKey: string | null = oauthFail ? "auth_err_generic" : null;

  useEffect(() => {
    if (getSessionUser()) navigate("/", { replace: true });
  }, [navigate]);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "oauth_missing" || err === "oauth_failed") {
      setOauthFail(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const token = searchParams.get("access_token");
    if (!token) return;
    setAccessToken(token);
    setSearchParams({}, { replace: true });
    void (async () => {
      try {
        await syncSessionFromApiMe();
        navigate("/", { replace: true });
        window.dispatchEvent(new Event("conce-auth-success"));
      } catch {
        navigate("/", { replace: true });
      }
    })();
  }, [searchParams, setSearchParams, navigate]);

  const onSpotifyLogin = () => {
    void startSpotifyOAuthRedirect().catch(() => undefined);
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


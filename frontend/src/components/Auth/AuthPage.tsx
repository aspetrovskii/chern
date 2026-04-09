import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { t, type Locale } from "../../lib/i18n";
import { getSessionUser, loginUser, registerUser } from "../../lib/auth";
import { loadTurnstileScript, TURNSTILE_SITE_KEY } from "../../lib/turnstile";
import formsStyles from "../Forms.module.css";
import neoStyles from "../NeoSurface.module.css";
import authStyles from "./AuthPage.module.css";
import layoutStyles from "../MainLayout.module.css";

type AuthPageProps = {
  locale: Locale;
};

type AuthMode = "login" | "register";

export function AuthPage({ locale }: AuthPageProps) {
  const navigate = useNavigate();
  const turnstileHostRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | number | null>(null);

  const [mode, setMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [errKey, setErrKey] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  useEffect(() => {
    if (getSessionUser()) navigate("/", { replace: true });
  }, [navigate]);

  const resetTurnstile = () => {
    setTurnstileToken("");
    const id = turnstileWidgetIdRef.current;
    if (id !== null && window.turnstile) {
      try {
        window.turnstile.reset(id);
      } catch {
        /* ignore */
      }
    }
  };

  const setModeTab = (m: AuthMode) => {
    if (m === mode) return;
    setMode(m);
    setErrKey(null);
    resetTurnstile();
  };

  useEffect(() => {
    let alive = true;
    const host = turnstileHostRef.current;
    if (!host) return;
    host.replaceChildren();

    loadTurnstileScript()
      .then(() => {
        if (!alive || !host.isConnected || !window.turnstile) return;
        host.replaceChildren();
        const id = window.turnstile.render(host, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(""),
          "error-callback": () => setTurnstileToken(""),
        });
        if (!alive) {
          try {
            window.turnstile.remove(id);
          } catch {
            /* ignore */
          }
          return;
        }
        turnstileWidgetIdRef.current = id;
      })
      .catch(() => {
        if (alive) setErrKey("auth_err_turnstile_load");
      });

    return () => {
      alive = false;
      const id = turnstileWidgetIdRef.current;
      turnstileWidgetIdRef.current = null;
      if (id !== null && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          /* ignore */
        }
      }
      host.replaceChildren();
    };
  }, []);

  const showError = (key: string) => setErrKey(key);

  const onSubmit = async () => {
    setErrKey(null);
    if (!turnstileToken) {
      showError("auth_err_turnstile");
      return;
    }
    const pw = password;
    if (mode === "register") {
      const log = username;
      const em = email.trim();
      if (!log?.trim() || !em || !pw) {
        showError("auth_err_required_register");
        return;
      }
      if (pw !== password2) {
        showError("auth_err_mismatch");
        return;
      }
      const r = await registerUser({ login: log, email: em, password: pw });
      if (!r.ok) {
        const map: Record<string, string> = {
          exists_email: "auth_err_exists_email",
          exists_login: "auth_err_exists_login",
          invalid_login: "auth_err_invalid_login",
          invalid_email: "auth_err_invalid_email",
          invalid: "auth_err_required_register",
        };
        showError(map[r.error] ?? "auth_err_generic");
        resetTurnstile();
        return;
      }
    } else {
      const id = identifier.trim();
      if (!id || !pw) {
        showError("auth_err_required_login");
        return;
      }
      const r = await loginUser({ identifier: id, password: pw });
      if (!r.ok) {
        showError("auth_err_login");
        resetTurnstile();
        return;
      }
    }
    navigate("/", { replace: true });
    window.dispatchEvent(new Event("conce-auth-success"));
  };

  return (
    <div className={authStyles["auth-page-root"]}>
      <div className={`${authStyles["auth-page__shell"]} ${neoStyles["neo-surface"]}`}>
        <h1 className={`${layoutStyles["page-title"]} ${authStyles["auth-page__title"]}`}>
          {mode === "login" ? t(locale, "auth_title_login") : t(locale, "auth_title_register")}
        </h1>
        <div className={authStyles["auth-page__tabs"]}>
          <button
            type="button"
            className={`${authStyles["auth-page__tab"]}${mode === "login" ? ` ${authStyles["auth-page__tab--active"]}` : ""}`}
            onClick={() => setModeTab("login")}
          >
            {t(locale, "auth_tab_login")}
          </button>
          <button
            type="button"
            className={`${authStyles["auth-page__tab"]}${mode === "register" ? ` ${authStyles["auth-page__tab--active"]}` : ""}`}
            onClick={() => setModeTab("register")}
          >
            {t(locale, "auth_tab_register")}
          </button>
        </div>
        <div className={authStyles["auth-page__err"]} role="alert" hidden={!errKey}>
          {errKey ? t(locale, errKey) : ""}
        </div>
        <div
          className={formsStyles["help-form__field"]}
          style={{ display: mode === "login" ? undefined : "none" }}
        >
          <label className={formsStyles["help-form__label"]} htmlFor="auth-identifier">
            {t(locale, "auth_identifier_label")}
          </label>
          <input
            id="auth-identifier"
            type="text"
            className={formsStyles["neo-glass-input"]}
            autoComplete="username"
            aria-required={mode === "login"}
            required={mode === "login"}
            placeholder={t(locale, "auth_placeholder_identifier")}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>
        <div
          className={formsStyles["help-form__field"]}
          style={{ display: mode === "register" ? undefined : "none" }}
        >
          <label className={formsStyles["help-form__label"]} htmlFor="auth-username">
            {t(locale, "auth_username")}
          </label>
          <input
            id="auth-username"
            type="text"
            className={formsStyles["neo-glass-input"]}
            autoComplete="username"
            aria-required={mode === "register"}
            required={mode === "register"}
            placeholder={t(locale, "auth_placeholder_username")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div
          className={formsStyles["help-form__field"]}
          style={{ display: mode === "register" ? undefined : "none" }}
        >
          <label className={formsStyles["help-form__label"]} htmlFor="auth-email">
            {t(locale, "auth_email")}
          </label>
          <input
            id="auth-email"
            type="email"
            className={formsStyles["neo-glass-input"]}
            aria-required={mode === "register"}
            required={mode === "register"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className={formsStyles["help-form__field"]}>
          <label className={formsStyles["help-form__label"]} htmlFor="auth-password">
            {t(locale, "auth_password")}
          </label>
          <input
            id="auth-password"
            type="password"
            className={formsStyles["neo-glass-input"]}
            aria-required="true"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div
          className={formsStyles["help-form__field"]}
          style={{ display: mode === "register" ? undefined : "none" }}
        >
          <label className={formsStyles["help-form__label"]} htmlFor="auth-password2">
            {t(locale, "auth_password_confirm")}
          </label>
          <input
            id="auth-password2"
            type="password"
            className={formsStyles["neo-glass-input"]}
            autoComplete="new-password"
            aria-required={mode === "register"}
            required={mode === "register"}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </div>
        <div className={`${formsStyles["help-form__field"]} ${authStyles["auth-page__captcha-wrap"]}`}>
          <div ref={turnstileHostRef} className={authStyles["auth-page__turnstile"]} id="auth-turnstile-host" />
        </div>
        <div className={authStyles["auth-page__actions"]}>
          <button
            type="button"
            className={`${formsStyles["neo-glass-btn"]} ${authStyles["auth-page__submit"]}`}
            onClick={() => void onSubmit()}
          >
            {t(locale, "auth_submit")}
          </button>
        </div>
        <a className={authStyles["auth-page__back"]} href="#/">
          {t(locale, "auth_back_home")}
        </a>
      </div>
    </div>
  );
}


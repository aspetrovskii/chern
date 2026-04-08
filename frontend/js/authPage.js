import { t } from "./i18n.js";
import { loginUser, registerUser, getSessionUser } from "./auth.js";
import { loadTurnstileScript, TURNSTILE_SITE_KEY } from "./turnstile.js";
import { navigate } from "./router.js";

/** @typedef {import('./i18n.js').Locale} Locale */

/**
 * @param {Locale} locale
 * @param {HTMLElement} container
 */
export function mountAuthPage(locale, container) {
  if (getSessionUser()) {
    navigate("home");
    return function noop() {};
  }

  const wrap = document.createElement("div");
  wrap.className = "auth-page";

  const shell = document.createElement("div");
  shell.className = "auth-page__shell neo-surface";

  let mode = /** @type {'login' | 'register'} */ ("login");

  const title = document.createElement("h1");
  title.className = "page-title auth-page__title";

  const tabs = document.createElement("div");
  tabs.className = "auth-page__tabs";

  const tabLogin = document.createElement("button");
  tabLogin.type = "button";
  tabLogin.className = "auth-page__tab";

  const tabRegister = document.createElement("button");
  tabRegister.type = "button";
  tabRegister.className = "auth-page__tab";

  const err = document.createElement("div");
  err.className = "auth-page__err";
  err.setAttribute("role", "alert");
  err.hidden = true;

  const loginFieldWrap = fieldWrap();
  const identifier = inputEl("text", "auth-identifier", true);
  identifier.setAttribute("autocomplete", "username");
  const identifierLabel = labelEl(t(locale, "auth_identifier_label"), "auth-identifier");

  const userWrap = fieldWrap();
  const username = inputEl("text", "auth-username", true);
  username.setAttribute("autocomplete", "username");
  const usernameLabel = labelEl(t(locale, "auth_username"), "auth-username");

  const emailWrap = fieldWrap();
  const email = inputEl("email", "auth-email", true);
  const emailLabel = labelEl(t(locale, "auth_email"), "auth-email");

  const passWrap = fieldWrap();
  const password = inputEl("password", "auth-password", true);
  const passLabel = labelEl(t(locale, "auth_password"), "auth-password");

  const confirmWrap = fieldWrap();
  const password2 = inputEl("password", "auth-password2", false);
  password2.setAttribute("autocomplete", "new-password");
  const confirmLabel = labelEl(t(locale, "auth_password_confirm"), "auth-password2");

  const captchaWrap = fieldWrap();
  captchaWrap.classList.add("auth-page__captcha-wrap");
  const turnstileHost = document.createElement("div");
  turnstileHost.className = "auth-page__turnstile";
  turnstileHost.id = "auth-turnstile-host";

  /** @type {string} */
  let turnstileToken = "";
  /** @type {string | number | null} */
  let turnstileWidgetId = null;

  function syncMode() {
    title.textContent =
      mode === "login" ? t(locale, "auth_title_login") : t(locale, "auth_title_register");
    tabLogin.classList.toggle("auth-page__tab--active", mode === "login");
    tabRegister.classList.toggle("auth-page__tab--active", mode === "register");
    loginFieldWrap.style.display = mode === "login" ? "" : "none";
    userWrap.style.display = mode === "register" ? "" : "none";
    emailWrap.style.display = mode === "register" ? "" : "none";
    confirmWrap.style.display = mode === "register" ? "" : "none";
    password2.required = mode === "register";
    identifier.required = mode === "login";
    username.required = mode === "register";
    email.required = mode === "register";
    err.hidden = true;
    identifier.placeholder = t(locale, "auth_placeholder_identifier");
    username.placeholder = t(locale, "auth_placeholder_username");
    resetTurnstile();
  }

  function resetTurnstile() {
    turnstileToken = "";
    if (turnstileWidgetId !== null && window.turnstile) {
      try {
        window.turnstile.reset(turnstileWidgetId);
      } catch {
        /* ignore */
      }
    }
  }

  tabLogin.textContent = t(locale, "auth_tab_login");
  tabRegister.textContent = t(locale, "auth_tab_register");
  tabLogin.addEventListener("click", () => {
    mode = "login";
    syncMode();
  });
  tabRegister.addEventListener("click", () => {
    mode = "register";
    syncMode();
  });

  loginFieldWrap.appendChild(identifierLabel);
  loginFieldWrap.appendChild(identifier);
  userWrap.appendChild(usernameLabel);
  userWrap.appendChild(username);
  emailWrap.appendChild(emailLabel);
  emailWrap.appendChild(email);
  passWrap.appendChild(passLabel);
  passWrap.appendChild(password);
  confirmWrap.appendChild(confirmLabel);
  confirmWrap.appendChild(password2);
  captchaWrap.appendChild(turnstileHost);

  const actions = document.createElement("div");
  actions.className = "auth-page__actions";
  const submit = document.createElement("button");
  submit.type = "button";
  submit.className = "help-form__submit neo-glass-btn";
  submit.textContent = t(locale, "auth_submit");

  const back = document.createElement("a");
  back.className = "auth-page__back";
  back.href = "#/";
  back.textContent = t(locale, "auth_back_home");

  function showError(key) {
    err.textContent = t(locale, key);
    err.hidden = false;
  }

  let cancelled = false;

  loadTurnstileScript()
    .then(() => {
      if (cancelled || !window.turnstile) return;
      turnstileWidgetId = window.turnstile.render(turnstileHost, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => {
          turnstileToken = token;
        },
        "expired-callback": () => {
          turnstileToken = "";
        },
        "error-callback": () => {
          turnstileToken = "";
        },
      });
    })
    .catch(() => {
      showError("auth_err_turnstile_load");
    });

  submit.addEventListener("click", async () => {
    err.hidden = true;
    if (!turnstileToken) {
      showError("auth_err_turnstile");
      return;
    }
    const pw = password.value;
    if (mode === "register") {
      const log = username.value;
      const em = email.value.trim();
      if (!log?.trim() || !em || !pw) {
        showError("auth_err_required_register");
        return;
      }
      if (pw !== password2.value) {
        showError("auth_err_mismatch");
        return;
      }
      const r = await registerUser({ login: log, email: em, password: pw });
      if (!r.ok) {
        const map = {
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
      const id = identifier.value.trim();
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
    navigate("home");
    window.dispatchEvent(new Event("conce-auth-success"));
  });

  tabs.appendChild(tabLogin);
  tabs.appendChild(tabRegister);

  actions.appendChild(submit);

  shell.appendChild(title);
  shell.appendChild(tabs);
  shell.appendChild(err);
  shell.appendChild(loginFieldWrap);
  shell.appendChild(userWrap);
  shell.appendChild(emailWrap);
  shell.appendChild(passWrap);
  shell.appendChild(confirmWrap);
  shell.appendChild(captchaWrap);
  shell.appendChild(actions);
  shell.appendChild(back);

  wrap.appendChild(shell);
  container.appendChild(wrap);

  syncMode();

  return function cleanupAuth() {
    cancelled = true;
    if (turnstileWidgetId !== null && window.turnstile) {
      try {
        window.turnstile.remove(turnstileWidgetId);
      } catch {
        /* ignore */
      }
    }
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  };
}

function fieldWrap() {
  const d = document.createElement("div");
  d.className = "help-form__field";
  return d;
}

/** @param {string} text @param {string} forId */
function labelEl(text, forId) {
  const l = document.createElement("label");
  l.className = "help-form__label";
  l.htmlFor = forId;
  l.textContent = text;
  return l;
}

/**
 * @param {string} type
 * @param {string} id
 * @param {boolean} required
 */
function inputEl(type, id, required) {
  const input = document.createElement("input");
  input.id = id;
  input.type = type;
  input.className = "help-form__input neo-glass-input";
  if (required) input.setAttribute("aria-required", "true");
  return input;
}

import { LOCALE_META, flagImageUrl, setLocale, t, notifyLocaleChange } from "./i18n.js";
import { getSessionUser, logoutUser } from "./auth.js";

/** @typedef {import('./i18n.js').Locale} Locale */

function createLangDropdown(locale, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "lang-dropdown";
  wrap.setAttribute("data-dropdown", "");

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nav-btn nav-btn--lang";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");

  const meta = LOCALE_META[locale];
  btn.setAttribute("aria-label", `${t(locale, "lang_label")}: ${meta.label}`);
  const btnFlagSrc = flagImageUrl(meta.flagCode, 40);
  const btnFlagSrc2x = flagImageUrl(meta.flagCode, 80);
  btn.innerHTML = `
    <span class="lang-btn__row">
      <img class="lang-flag-img" src="${btnFlagSrc}" srcset="${btnFlagSrc2x} 2x" width="32" height="24" alt="" decoding="async" loading="eager" />
      <span class="lang-btn__label nav-text">${meta.label}</span>
    </span>
    <span class="nav-btn__chev" aria-hidden="true">▾</span>
  `;

  const panel = document.createElement("div");
  panel.className = "lang-dropdown__panel";
  panel.setAttribute("role", "listbox");
  panel.setAttribute("aria-label", t(locale, "lang_label"));

  /** @type {Locale[]} */
  const order = ["ru", "en", "tr", "hi", "zh"];
  order.forEach((code) => {
    const opt = document.createElement("button");
    opt.type = "button";
    opt.className = "lang-option" + (code === locale ? " lang-option--active" : "");
    opt.setAttribute("role", "option");
    opt.setAttribute("aria-selected", code === locale ? "true" : "false");
    const m = LOCALE_META[code];
    opt.setAttribute("aria-label", m.label);
    const src = flagImageUrl(m.flagCode, 40);
    const src2 = flagImageUrl(m.flagCode, 80);
    opt.innerHTML = `
      <img class="lang-flag-img" src="${src}" srcset="${src2} 2x" width="36" height="27" alt="" decoding="async" />
      <span class="lang-option__label">${m.label}</span>
    `;
    opt.addEventListener("click", () => {
      setLocale(code);
      notifyLocaleChange();
      close();
      onChange();
    });
    panel.appendChild(opt);
  });

  function open() {
    wrap.classList.add("lang-dropdown--open");
    btn.setAttribute("aria-expanded", "true");
  }

  function close() {
    wrap.classList.remove("lang-dropdown--open");
    btn.setAttribute("aria-expanded", "false");
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (wrap.classList.contains("lang-dropdown--open")) close();
    else open();
  });

  wrap.appendChild(btn);
  wrap.appendChild(panel);

  document.addEventListener("click", () => close());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  return wrap;
}

/**
 * @param {{ locale: Locale; onLocaleChange: () => void; onAuthChange?: () => void }} props
 */
export function createHeader({ locale, onLocaleChange, onAuthChange }) {
  const header = document.createElement("header");
  header.className = "site-header";

  const brand = document.createElement("a");
  brand.className = "site-header__brand";
  brand.href = "#/";
  brand.setAttribute("aria-label", t(locale, "brand"));
  brand.innerHTML = `<span class="logo-text">${t(locale, "brand")}</span>`;

  const nav = document.createElement("nav");
  nav.className = "site-header__nav";
  nav.setAttribute("aria-label", "Main");

  const lang = createLangDropdown(locale, onLocaleChange);

  const session = getSessionUser();

  if (session) {
    const userLabel = document.createElement("span");
    userLabel.className = "nav-user-label";
    const display = session.login || session.email;
    userLabel.textContent =
      display.length > 22 ? `${display.slice(0, 20)}…` : display;
    userLabel.title = session.email;

    const signOut = document.createElement("button");
    signOut.type = "button";
    signOut.className = "nav-btn";
    signOut.innerHTML = `<span class="nav-text">${t(locale, "nav_sign_out")}</span>`;
    signOut.addEventListener("click", () => {
      logoutUser();
      onAuthChange?.();
    });

    nav.appendChild(userLabel);
    nav.appendChild(signOut);
  } else {
    const signIn = document.createElement("a");
    signIn.className = "nav-btn";
    signIn.href = "#/auth";
    signIn.innerHTML = `<span class="nav-text">${t(locale, "nav_sign_in")}</span>`;
    nav.appendChild(signIn);
  }

  const chat = document.createElement("a");
  chat.className = "nav-btn";
  chat.href = "#/chat";
  chat.innerHTML = `<span class="nav-text">${t(locale, "nav_chat")}</span>`;

  const help = document.createElement("a");
  help.className = "nav-btn";
  help.href = "#/help";
  help.innerHTML = `<span class="nav-text">${t(locale, "nav_help")}</span>`;

  nav.appendChild(chat);
  nav.appendChild(help);
  nav.appendChild(lang);

  header.appendChild(brand);
  header.appendChild(nav);

  return header;
}

import { LOCALE_META, getLocale, setLocale, t, notifyLocaleChange } from "./i18n.js";
import { navigate } from "./router.js";

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
  btn.innerHTML = `<span class="lang-option__flag" aria-hidden="true">${meta.flag}</span><span class="text-brand">${meta.label}</span><span class="nav-btn__chev" aria-hidden="true">▾</span>`;

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
    opt.innerHTML = `<span class="lang-option__flag" aria-hidden="true">${m.flag}</span><span class="text-brand">${m.label}</span>`;
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
 * @param {{ locale: Locale; onLocaleChange: () => void }} props
 */
export function createHeader({ locale, onLocaleChange }) {
  const header = document.createElement("header");
  header.className = "site-header";

  const brand = document.createElement("a");
  brand.className = "site-header__brand";
  brand.href = "#/";
  brand.setAttribute("aria-label", t(locale, "brand"));
  brand.innerHTML = `<span class="text-brand">${t(locale, "brand")}</span>`;

  const nav = document.createElement("nav");
  nav.className = "site-header__nav";
  nav.setAttribute("aria-label", "Main");

  const lang = createLangDropdown(locale, onLocaleChange);

  const chat = document.createElement("a");
  chat.className = "nav-btn";
  chat.href = "#/chat";
  chat.innerHTML = `<span class="text-brand">${t(locale, "nav_chat")}</span>`;

  const help = document.createElement("a");
  help.className = "nav-btn";
  help.href = "#/help";
  help.innerHTML = `<span class="text-brand">${t(locale, "nav_help")}</span>`;

  nav.appendChild(lang);
  nav.appendChild(chat);
  nav.appendChild(help);

  header.appendChild(brand);
  header.appendChild(nav);

  return header;
}

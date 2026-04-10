import { useCallback, useEffect, useState } from "react";
import {
  LOCALE_META,
  flagImageUrl,
  notifyLocaleChange,
  setLocale,
  t,
  type Locale,
} from "../../lib/i18n";
import { getSessionUser, logoutUser } from "../../lib/auth";
import headerStyles from "./Header.module.css";
import brandStyles from "../BrandText.module.css";

const LANG_ORDER: Locale[] = ["ru", "en", "de", "es", "id", "tr", "hi", "ur", "zh"];

type LangDropdownProps = {
  locale: Locale;
};

function LangDropdown({ locale }: LangDropdownProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onDoc = () => close();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [close]);

  const meta = LOCALE_META[locale];
  const btnFlagSrc = flagImageUrl(meta.flagCode, 40);
  const btnFlagSrc2x = flagImageUrl(meta.flagCode, 80);

  return (
    <div
      className={`${headerStyles["lang-dropdown"]} ${open ? headerStyles["lang-dropdown--open"] : ""}`}
      data-dropdown=""
    >
      <button
        type="button"
        className={`${headerStyles["nav-btn"]} ${headerStyles["nav-btn--lang"]}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t(locale, "lang_label")}: ${meta.label}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className={headerStyles["lang-btn__row"]}>
          <img
            className={headerStyles["lang-flag-img"]}
            src={btnFlagSrc}
            srcSet={`${btnFlagSrc2x} 2x`}
            width={32}
            height={24}
            alt=""
            decoding="async"
            loading="eager"
          />
          <span className={`${headerStyles["lang-btn__label"]} ${headerStyles["nav-text"]}`}>
            {meta.label}
          </span>
        </span>
        <span className={headerStyles["nav-btn__chev"]} aria-hidden="true">
          ▾
        </span>
      </button>
      <div
        className={headerStyles["lang-dropdown__panel"]}
        role="listbox"
        aria-label={t(locale, "lang_label")}
      >
        {LANG_ORDER.map((code) => {
          const m = LOCALE_META[code];
          const src = flagImageUrl(m.flagCode, 40);
          const src2 = flagImageUrl(m.flagCode, 80);
          return (
            <button
              key={code}
              type="button"
              className={`${headerStyles["lang-option"]}${code === locale ? ` ${headerStyles["lang-option--active"]}` : ""}`}
              role="option"
              aria-selected={code === locale}
              aria-label={m.label}
              onClick={() => {
                setLocale(code);
                notifyLocaleChange();
                close();
              }}
            >
              <img
                className={headerStyles["lang-flag-img"]}
                src={src}
                srcSet={`${src2} 2x`}
                width={36}
                height={27}
                alt=""
                decoding="async"
              />
              <span className={headerStyles["lang-option__label"]}>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type HeaderProps = {
  locale: Locale;
  onAuthChange: () => void;
};

export function Header({ locale, onAuthChange }: HeaderProps) {
  const session = getSessionUser();

  return (
    <header className={headerStyles["site-header"]}>
      <a
        className={brandStyles["site-header__brand"]}
        href="#/"
        aria-label={t(locale, "brand")}
      >
        <span className={brandStyles["logo-text"]}>{t(locale, "brand")}</span>
      </a>
      <nav className={headerStyles["site-header__nav"]} aria-label="Main">
        {session ? (
          <>
            <span className={headerStyles["nav-user-label"]} title={session.email}>
              {(session.login || session.email).length > 22
                ? `${(session.login || session.email).slice(0, 20)}…`
                : session.login || session.email}
            </span>
            <button
              type="button"
              className={headerStyles["nav-btn"]}
              onClick={() => {
                logoutUser();
                onAuthChange();
              }}
            >
              <span className={headerStyles["nav-text"]}>{t(locale, "nav_sign_out")}</span>
            </button>
          </>
        ) : (
          <a className={headerStyles["nav-btn"]} href="#/auth">
            <span className={headerStyles["nav-text"]}>{t(locale, "nav_sign_in")}</span>
          </a>
        )}
        <a className={headerStyles["nav-btn"]} href="#/chat">
          <span className={headerStyles["nav-text"]}>{t(locale, "nav_chat")}</span>
        </a>
        <a className={headerStyles["nav-btn"]} href="#/saved-concerts">
          <span className={headerStyles["nav-text"]}>{t(locale, "nav_saved_concerts")}</span>
        </a>
        <a className={headerStyles["nav-btn"]} href="#/help">
          <span className={headerStyles["nav-text"]}>{t(locale, "nav_help")}</span>
        </a>
        <LangDropdown locale={locale} />
      </nav>
    </header>
  );
}

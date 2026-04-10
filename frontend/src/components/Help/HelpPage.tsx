import { useEffect, useRef, useState } from "react";
import { t, type Locale } from "../../lib/i18n";
import formsStyles from "../Forms.module.css";
import helpStyles from "./HelpPage.module.css";
import layoutStyles from "../MainLayout.module.css";

type HelpPageProps = {
  locale: Locale;
};

export function HelpPage({ locale }: HelpPageProps) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formBlockHidden, setFormBlockHidden] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const thanksRef = useRef<HTMLDivElement>(null);

  const okText = message.trim().length > 0;
  const okMail = email.trim().length > 0 && (emailRef.current?.checkValidity() ?? false);
  const submitDisabled = !(okText && okMail);

  useEffect(() => {
    if (submitted) thanksRef.current?.focus();
  }, [submitted]);

  return (
    <div className={helpStyles["help-page"]}>
      <h1 className={layoutStyles["page-title"]}>{t(locale, "page_help_title")}</h1>
      <p className={helpStyles["help-page__intro"]}>{t(locale, "help_support_intro")}</p>
      <div className={helpStyles["help-page__form-block"]} hidden={formBlockHidden}>
        <form
          className={formsStyles["help-form"]}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const ok =
              message.trim().length > 0 &&
              email.trim().length > 0 &&
              (emailRef.current?.checkValidity() ?? false);
            if (!ok) return;
            setFormBlockHidden(true);
            setSubmitted(true);
          }}
        >
          <div className={formsStyles["help-form__field"]}>
            <label className={formsStyles["help-form__label"]} htmlFor="help-message">
              {t(locale, "help_field_message")}
            </label>
            <textarea
              id="help-message"
              className={`${formsStyles["help-form__textarea"]} ${formsStyles["neo-glass-input"]}`}
              rows={6}
              autoComplete="off"
              aria-required="true"
              placeholder={t(locale, "help_placeholder_message")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className={formsStyles["help-form__field"]}>
            <label className={formsStyles["help-form__label"]} htmlFor="help-email">
              {t(locale, "help_field_email")}
            </label>
            <input
              ref={emailRef}
              id="help-email"
              type="email"
              className={formsStyles["neo-glass-input"]}
              autoComplete="email"
              aria-required="true"
              placeholder={t(locale, "help_placeholder_email")}
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={formsStyles["help-form__actions"]}>
            <button
              type="submit"
              className={formsStyles["neo-glass-btn"]}
              disabled={submitDisabled}
            >
              {t(locale, "help_submit")}
            </button>
          </div>
        </form>
      </div>
      <div
        ref={thanksRef}
        className={helpStyles["help-page__thanks"]}
        role="status"
        aria-live="polite"
        tabIndex={-1}
        hidden={!submitted}
      >
        {t(locale, "help_thanks")}
      </div>
    </div>
  );
}

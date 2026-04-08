import { t } from "./i18n.js";

/** @typedef {import('./i18n.js').Locale} Locale */

/**
 * @param {Locale} locale
 * @param {HTMLElement} container
 */
export function mountHelpPage(locale, container) {
  const wrap = document.createElement("div");
  wrap.className = "help-page";

  const h1 = document.createElement("h1");
  h1.className = "page-title";
  h1.textContent = t(locale, "page_help_title");

  const intro = document.createElement("p");
  intro.className = "help-page__intro";
  intro.textContent = t(locale, "help_support_intro");

  const formBlock = document.createElement("div");
  formBlock.className = "help-page__form-block";

  const form = document.createElement("form");
  form.className = "help-form";
  form.setAttribute("novalidate", "");

  const msgWrap = document.createElement("div");
  msgWrap.className = "help-form__field";
  const msgLabel = document.createElement("label");
  msgLabel.className = "help-form__label";
  msgLabel.htmlFor = "help-message";
  msgLabel.textContent = t(locale, "help_field_message");
  const message = document.createElement("textarea");
  message.id = "help-message";
  message.className = "help-form__textarea neo-glass-input";
  message.rows = 6;
  message.setAttribute("autocomplete", "off");
  message.setAttribute("aria-required", "true");
  message.placeholder = t(locale, "help_placeholder_message");

  const emailWrap = document.createElement("div");
  emailWrap.className = "help-form__field";
  const emailLabel = document.createElement("label");
  emailLabel.className = "help-form__label";
  emailLabel.htmlFor = "help-email";
  emailLabel.textContent = t(locale, "help_field_email");
  const email = document.createElement("input");
  email.id = "help-email";
  email.type = "email";
  email.className = "help-form__input neo-glass-input";
  email.setAttribute("autocomplete", "email");
  email.setAttribute("aria-required", "true");
  email.placeholder = t(locale, "help_placeholder_email");
  email.inputMode = "email";

  const actions = document.createElement("div");
  actions.className = "help-form__actions";
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "help-form__submit neo-glass-btn";
  submit.textContent = t(locale, "help_submit");
  submit.disabled = true;

  const thanks = document.createElement("div");
  thanks.className = "help-page__thanks";
  thanks.setAttribute("role", "status");
  thanks.setAttribute("aria-live", "polite");
  thanks.setAttribute("tabindex", "-1");
  thanks.hidden = true;
  thanks.textContent = t(locale, "help_thanks");

  function syncSubmitEnabled() {
    const okText = message.value.trim().length > 0;
    const okMail = email.value.trim().length > 0 && email.checkValidity();
    submit.disabled = !(okText && okMail);
  }

  message.addEventListener("input", syncSubmitEnabled);
  email.addEventListener("input", syncSubmitEnabled);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    syncSubmitEnabled();
    if (submit.disabled) return;
    formBlock.hidden = true;
    thanks.hidden = false;
    thanks.focus();
  });

  msgWrap.appendChild(msgLabel);
  msgWrap.appendChild(message);
  emailWrap.appendChild(emailLabel);
  emailWrap.appendChild(email);
  actions.appendChild(submit);

  form.appendChild(msgWrap);
  form.appendChild(emailWrap);
  form.appendChild(actions);
  formBlock.appendChild(form);

  wrap.appendChild(h1);
  wrap.appendChild(intro);
  wrap.appendChild(formBlock);
  wrap.appendChild(thanks);
  container.appendChild(wrap);

  return function cleanupHelp() {
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  };
}

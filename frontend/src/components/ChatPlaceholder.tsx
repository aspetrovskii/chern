import { t, type Locale } from "../lib/i18n";
import layoutStyles from "./MainLayout.module.css";

type ChatPlaceholderProps = {
  locale: Locale;
};

export function ChatPlaceholder({ locale }: ChatPlaceholderProps) {
  return (
    <div className={layoutStyles["page-placeholder"]}>
      <h1 className={layoutStyles["page-title"]}>{t(locale, "page_chat_title")}</h1>
      <p>{t(locale, "page_chat_body")}</p>
    </div>
  );
}

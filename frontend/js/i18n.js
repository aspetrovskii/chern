/** @typedef {'ru'|'en'|'tr'|'hi'|'zh'} Locale */

const STORAGE_KEY = "conce-ai-locale";

/** @type {Record<Locale, Record<string, string>>} */
const MESSAGES = {
  en: {
    brand: "Conce AI",
    nav_chat: "Chat",
    nav_help: "Help",
    lang_label: "Language",
    page_home_title: "Home",
    page_home_body: "Mock API is connected. Header and routing are ready for testing.",
    page_chat_title: "Chat",
    page_chat_body: "Chat screen placeholder — backend integration comes later.",
    page_help_title: "Help",
    page_help_body: "Help screen placeholder — documentation will appear here.",
  },
  ru: {
    brand: "Conce AI",
    nav_chat: "Чат",
    nav_help: "Помощь",
    lang_label: "Язык",
    page_home_title: "Главная",
    page_home_body:
      "Подключён mock API. Шапка и маршрутизация готовы к тестированию.",
    page_chat_title: "Чат",
    page_chat_body: "Заглушка экрана чата — бэкенд подключится позже.",
    page_help_title: "Помощь",
    page_help_body: "Заглушка раздела помощи — здесь будет документация.",
  },
  tr: {
    brand: "Conce AI",
    nav_chat: "Sohbet",
    nav_help: "Yardım",
    lang_label: "Dil",
    page_home_title: "Ana sayfa",
    page_home_body:
      "Sahte API bağlı. Üst bilgi ve yönlendirme test için hazır.",
    page_chat_title: "Sohbet",
    page_chat_body: "Sohbet ekranı yer tutucu — arka uç daha sonra bağlanacak.",
    page_help_title: "Yardım",
    page_help_body: "Yardım yer tutucu — belgeler burada olacak.",
  },
  hi: {
    brand: "Conce AI",
    nav_chat: "चैट",
    nav_help: "सहायता",
    lang_label: "भाषा",
    page_home_title: "होम",
    page_home_body:
      "मॉक API जुड़ा है। हेडर और रूटिंग परीक्षण के लिए तैयार हैं।",
    page_chat_title: "चैट",
    page_chat_body: "चैट स्क्रीन प्लेसहोल्ड — बैकएंड बाद में जुड़ेगा।",
    page_help_title: "सहायता",
    page_help_body: "सहायता प्लेसहोल्ड — यहाँ दस्तावेज़ होंगे।",
  },
  zh: {
    brand: "Conce AI",
    nav_chat: "聊天",
    nav_help: "帮助",
    lang_label: "语言",
    page_home_title: "首页",
    page_home_body: "已连接 Mock API。页眉与路由可用于测试。",
    page_chat_title: "聊天",
    page_chat_body: "聊天页占位 — 后端稍后接入。",
    page_help_title: "帮助",
    page_help_body: "帮助占位 — 文档将显示于此。",
  },
};

/**
 * flagCode: ISO 3166-1 alpha-2 для https://flagcdn.com (фото флага)
 * en → gb (Великобритания), hi → in (Индия), zh → cn (КНР)
 */
/** @type {Record<Locale, { flagCode: string; label: string }>} */
export const LOCALE_META = {
  ru: { flagCode: "ru", label: "Русский" },
  en: { flagCode: "gb", label: "English" },
  tr: { flagCode: "tr", label: "Türkçe" },
  hi: { flagCode: "in", label: "हिन्दी" },
  zh: { flagCode: "cn", label: "中文" },
};

/** @param {string} flagCode @param {number} [w] */
export function flagImageUrl(flagCode, w = 40) {
  return `https://flagcdn.com/w${w}/${flagCode.toLowerCase()}.png`;
}

/** @returns {Locale} */
export function getLocale() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && saved in MESSAGES) return /** @type {Locale} */ (saved);
  const nav = navigator.language || "en";
  if (nav.startsWith("ru")) return "ru";
  if (nav.startsWith("tr")) return "tr";
  if (nav.startsWith("hi")) return "hi";
  if (nav.startsWith("zh")) return "zh";
  return "en";
}

/** @param {Locale} locale */
export function setLocale(locale) {
  if (!(locale in MESSAGES)) return;
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale === "zh" ? "zh-CN" : locale;
}

/** @param {Locale} locale */
export function t(locale, key) {
  const table = MESSAGES[locale] || MESSAGES.en;
  return table[key] ?? MESSAGES.en[key] ?? key;
}

export function subscribeLocale(callback) {
  window.addEventListener("conce-locale-change", () => callback(getLocale()));
}

export function notifyLocaleChange() {
  window.dispatchEvent(new Event("conce-locale-change"));
}

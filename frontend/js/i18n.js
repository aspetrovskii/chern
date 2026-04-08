/** @typedef {'ru'|'en'|'tr'|'hi'|'zh'} Locale */

const STORAGE_KEY = "conce-ai-locale";

/** @type {Record<Locale, Record<string, string>>} */
const MESSAGES = {
  en: {
    brand: "Conce AI",
    nav_chat: "Chat",
    nav_help: "Help",
    lang_label: "Language",
    home_hero_lead:
      "Your personal intelligence for music and mood. One prompt — a whole landscape of sound.",
    home_input_aria: "Ask ConceAI",
    home_send_aria: "Open chat and send",
    home_player_label: "Now playing",
    home_player_track: "Aurora Echo — «Midnight Bloom» (demo)",
    home_player_toggle_aria: "Collapse or expand the player",
    home_player_prev_aria: "Previous track",
    home_player_play_aria: "Play",
    home_player_pause_aria: "Pause",
    home_player_next_aria: "Next track",
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
    home_hero_lead:
      "Ваш личный интеллект для музыки и настроения. Один запрос — целый мир звука.",
    home_input_aria: "Запрос к ConceAI",
    home_send_aria: "Открыть чат и отправить",
    home_player_label: "Сейчас играет",
    home_player_track: "Aurora Echo — «Полночный цвет» (демо)",
    home_player_toggle_aria: "Свернуть или развернуть плеер",
    home_player_prev_aria: "Предыдущий трек",
    home_player_play_aria: "Воспроизведение",
    home_player_pause_aria: "Пауза",
    home_player_next_aria: "Следующий трек",
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
    home_hero_lead:
      "Müzik ve ruh hâliniz için kişisel zekâ. Tek istek — uçsuz bucaksız bir ses dünyası.",
    home_input_aria: "ConceAI'ye sor",
    home_send_aria: "Sohbeti aç ve gönder",
    home_player_label: "Çalıyor",
    home_player_track: "Aurora Echo — «Gece Yarısı Çiçeği» (demo)",
    home_player_toggle_aria: "Oynatıcıyı daralt veya genişlet",
    home_player_prev_aria: "Önceki parça",
    home_player_play_aria: "Oynat",
    home_player_pause_aria: "Duraklat",
    home_player_next_aria: "Sonraki parça",
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
    home_hero_lead:
      "संगीत और मूड के लिए आपकी निजी बुद्धिमत्ता। एक प्रॉम्प्ट — ध्वनि का पूरा परिदृश्य।",
    home_input_aria: "ConceAI से पूछें",
    home_send_aria: "चैट खोलें और भेजें",
    home_player_label: "अभी बज रहा है",
    home_player_track: "Aurora Echo — «मिडनाइट ब्लूम» (डेमो)",
    home_player_toggle_aria: "प्लेयर छोटा या बड़ा करें",
    home_player_prev_aria: "पिछला ट्रैक",
    home_player_play_aria: "चलाएँ",
    home_player_pause_aria: "रोकें",
    home_player_next_aria: "अगला ट्रैक",
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
    home_hero_lead: "您专属的音乐与情绪智能。一句指令，一整片声音风景。",
    home_input_aria: "向 ConceAI 提问",
    home_send_aria: "打开聊天并发送",
    home_player_label: "正在播放",
    home_player_track: "Aurora Echo —《午夜花开》（演示）",
    home_player_toggle_aria: "收起或展开播放器",
    home_player_prev_aria: "上一曲",
    home_player_play_aria: "播放",
    home_player_pause_aria: "暂停",
    home_player_next_aria: "下一曲",
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

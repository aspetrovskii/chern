import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAccessToken } from "../../lib/api/http";
import { getSessionUser, syncSessionFromApiMe } from "../../lib/auth";
import { type Locale } from "../../lib/i18n";
import styles from "./ChatPage.module.css";
import { getTrackById as mvpGetTrackById, type ChatRecord } from "../../lib/concertMvp";
import {
  apiCreateChat,
  apiDeleteChat,
  apiListChats,
  apiLoadChatFull,
  apiPatchChatTitle,
  apiPatchConcertLabel,
  apiPatchConcertOrder,
  apiPostChatPrompt,
  getCachedTrack,
} from "../../lib/pendingBackendApi";
import { loadSavedConcertsFromStorage, persistSavedConcerts } from "../../lib/savedConcertsMvp";
import { PoolSidebar } from "./PoolSidebar";

type ChatPageProps = {
  locale: Locale;
};

const EMPTY_CHAT_HEADLINES_EN = [
  "Ready when you are.",
  "When do you want to start?",
  "What are we building today?",
  "Tell me what you have in mind.",
  "Let's shape your next idea.",
  "I'm listening. What's the plan?",
  "Start with a goal, and I'll help.",
  "Drop your prompt and let's go.",
  "What vibe are you aiming for?",
  "Need a fresh concept? I'm in.",
  "Describe the mood, I'll do the rest.",
  "Let's turn your thought into a flow.",
  "What's the first step?",
  "Say the word, we'll begin.",
  "Where should we begin?",
  "What should this become?",
  "I'm ready for your brief.",
  "Type your idea to kick things off.",
  "What's the direction today?",
  "Want to start bold or subtle?",
  "Set the tone, I'll follow.",
  "Let's make something memorable.",
  "Give me a hint, and we'll start.",
  "What's the mission for this chat?",
  "Your move. I'm ready.",
  "What's on your mind right now?",
  "Let's craft something awesome.",
  "Start simple, we can refine.",
  "What outcome do you want?",
  "Tell me the context, I'll adapt.",
  "Let's build this step by step.",
  "Share your draft idea.",
  "How do you want this to feel?",
  "What should happen next?",
  "Let's get your first version ready.",
  "Need options? Give me a starting point.",
  "Bring your rough idea here.",
  "Let's make your concept real.",
  "What's the target mood?",
  "Write one sentence to begin.",
  "Let's begin with your intention.",
  "I'm here for your next prompt.",
  "What's the core idea?",
  "Give me the spark, I'll help with the fire.",
  "Where do you want to take this?",
  "Start whenever you're ready.",
  "Let's launch this conversation.",
  "Need momentum? Let's start now.",
  "What's the one thing you need first?",
  "Share your goal, we'll map the path.",
  "Let's start clean and focused.",
  "Drop your first line.",
] as const;

const EMPTY_CHAT_HEADLINES_RU = [
  "Готов, когда будете готовы.",
  "Когда хотите начать?",
  "Что сегодня создаем?",
  "Расскажите, что у вас на уме.",
  "Давайте оформим вашу следующую идею.",
  "Я слушаю. Какой план?",
  "Начните с цели, а я помогу.",
  "Оставьте запрос и поехали.",
  "Какого вайба хотите добиться?",
  "Нужна свежая концепция? Я в деле.",
  "Опишите настроение, остальное сделаю я.",
  "Давайте превратим мысль в рабочий поток.",
  "Какой первый шаг?",
  "Скажите слово и начнем.",
  "С чего начнем?",
  "Во что это должно превратиться?",
  "Я готов к вашему брифу.",
  "Напишите идею, чтобы запустить процесс.",
  "Какое сегодня направление?",
  "Начнем смело или мягко?",
  "Задайте тон, я подстроюсь.",
  "Сделаем что-то запоминающееся.",
  "Дайте зацепку, и начнем.",
  "Какая цель у этого чата?",
  "Ваш ход. Я готов.",
  "Что у вас сейчас в голове?",
  "Давайте соберем что-то крутое.",
  "Начнем просто, затем улучшим.",
  "Какой результат вам нужен?",
  "Дайте контекст, я адаптируюсь.",
  "Построим все шаг за шагом.",
  "Поделитесь черновой идеей.",
  "Каким это должно ощущаться?",
  "Что должно произойти дальше?",
  "Соберем первую версию.",
  "Нужны варианты? Дайте стартовую точку.",
  "Приносите даже сырую идею.",
  "Сделаем вашу концепцию реальной.",
  "Какое целевое настроение?",
  "Напишите одно предложение для старта.",
  "Начнем с вашего намерения.",
  "Я здесь для вашего следующего запроса.",
  "В чем основная идея?",
  "Дайте искру, а я помогу разжечь огонь.",
  "Куда хотите это привести?",
  "Начинайте, когда будете готовы.",
  "Запустим этот диалог.",
  "Нужен импульс? Начнем прямо сейчас.",
  "Что вам нужно в первую очередь?",
  "Поделитесь целью, а маршрут составим вместе.",
  "Начнем чисто и по делу.",
  "Напишите первую строку.",
] as const;

const EMPTY_CHAT_HEADLINES_TR = [
  "Hazırım, siz hazır olduğunuzda.",
  "Ne zaman başlamak istersiniz?",
  "Bugün ne inşa ediyoruz?",
  "Aklınızdakini anlatın.",
  "Bir sonraki fikrinizi şekillendirelim.",
  "Dinliyorum. Planınız nedir?",
  "Bir hedefle başlayın, yardımcı olayım.",
  "İsteğinizi yazın, başlayalım.",
  "Hangi konser havasını hedefliyorsunuz?",
  "İlk adım ne olsun?",
] as const;

const EMPTY_CHAT_HEADLINES_HI = [
  "मैं तैयार हूँ, जब आप तैयार हों।",
  "आप कब शुरू करना चाहेंगे?",
  "आज हम क्या बना रहे हैं?",
  "बताइए, आप क्या सोच रहे हैं।",
  "आइए अगला आइडिया तैयार करें।",
  "मैं सुन रहा हूँ। योजना क्या है?",
  "एक लक्ष्य से शुरू करें, मैं मदद करूँगा।",
  "अपना संकेत लिखें और चल पड़ें।",
  "आप कैसा कॉन्सर्ट माहौल चाहते हैं?",
  "पहला कदम क्या हो?",
] as const;

const EMPTY_CHAT_HEADLINES_ZH = [
  "我准备好了，你也准备好时就开始。",
  "你想什么时候开始？",
  "今天我们要搭建什么？",
  "说说你的想法。",
  "一起打磨你的下一个点子。",
  "我在听。计划是什么？",
  "先定一个目标，我来协助。",
  "写下你的提示，我们出发。",
  "你想营造怎样的演出氛围？",
  "第一步做什么？",
] as const;

const EMPTY_CHAT_HEADLINES_UR = [
  "میں تیار ہوں، جب آپ تیار ہوں۔",
  "آپ کب شروع کرنا چاہیں گے؟",
  "آج ہم کیا بنا رہے ہیں؟",
  "بتائیں، آپ کے ذہن میں کیا ہے۔",
  "آئیے اگلا خیال سنواریں۔",
  "میں سن رہا ہوں۔ منصوبہ کیا ہے؟",
  "ایک ہدف سے شروع کریں، میں مدد کروں گا۔",
  "اپنا اشارہ لکھیں اور چل پڑیں۔",
  "کون سا کنسرٹ ماحول چاہیے؟",
  "پہلا قدم کیا ہو?",
] as const;

const EMPTY_CHAT_HEADLINES_ID = [
  "Saya siap kapan pun Anda siap.",
  "Kapan Anda ingin mulai?",
  "Apa yang kita bangun hari ini?",
  "Ceritakan yang Anda pikirkan.",
  "Mari wujudkan ide berikutnya.",
  "Saya mendengarkan. Apa rencananya?",
  "Mulai dari satu tujuan, saya bantu.",
  "Tulis permintaan Anda, lalu mulai.",
  "Vibe konser seperti apa yang Anda inginkan?",
  "Langkah pertama apa?",
] as const;

const EMPTY_CHAT_HEADLINES_ES = [
  "Listo cuando tú lo estés.",
  "¿Cuándo quieres empezar?",
  "¿Qué construimos hoy?",
  "Cuéntame qué tienes en mente.",
  "Moldeemos tu próxima idea.",
  "Te escucho. ¿Cuál es el plan?",
  "Empieza con un objetivo y te ayudo.",
  "Escribe tu idea y arrancamos.",
  "¿Qué ambiente de concierto buscas?",
  "¿Cuál es el primer paso?",
] as const;

const EMPTY_CHAT_HEADLINES_DE = [
  "Ich bin bereit, sobald du es bist.",
  "Wann möchtest du starten?",
  "Was bauen wir heute?",
  "Sag mir, was du im Kopf hast.",
  "Lass uns deine nächste Idee formen.",
  "Ich höre zu. Was ist der Plan?",
  "Starte mit einem Ziel, ich helfe.",
  "Schreib deinen Impuls und leg los.",
  "Welche Konzert-Stimmung willst du?",
  "Was ist der erste Schritt?",
] as const;

const EMPTY_CHAT_HEADLINES_BY_LOCALE: Record<Locale, readonly string[]> = {
  en: EMPTY_CHAT_HEADLINES_EN,
  ru: EMPTY_CHAT_HEADLINES_RU,
  tr: EMPTY_CHAT_HEADLINES_TR,
  hi: EMPTY_CHAT_HEADLINES_HI,
  zh: EMPTY_CHAT_HEADLINES_ZH,
  ur: EMPTY_CHAT_HEADLINES_UR,
  id: EMPTY_CHAT_HEADLINES_ID,
  es: EMPTY_CHAT_HEADLINES_ES,
  de: EMPTY_CHAT_HEADLINES_DE,
};

const CHAT_UI_TEXT: Record<
  Locale,
  {
    hideChats: string;
    showChats: string;
    newChat: string;
    searchChats: string;
    docs: string;
    faq: string;
    untitled: string;
    today: string;
    yesterday: string;
    twoDaysAgo: string;
    daysAgo: (days: number) => string;
    emptyInputPlaceholder: string;
    defaultInputPlaceholder: string;
    orderSourcePrefix: string;
    dragHint: string;
    versionLabel: string;
    saveConcert: string;
    llmReplyLabel: string;
    llmReplyPlaceholder: string;
    renameChat: string;
    renameConcertVersion: string;
    doubleClickToRename: string;
  }
> = {
  en: {
    hideChats: "Hide chats",
    showChats: "Show chats",
    newChat: "New chat",
    searchChats: "Search chats",
    docs: "Documentation",
    faq: "FAQ",
    untitled: "Untitled",
    today: "Today",
    yesterday: "Yesterday",
    twoDaysAgo: "Two days ago",
    daysAgo: (days) => `${days} days ago`,
    emptyInputPlaceholder: "How can I help you today?",
    defaultInputPlaceholder: "Describe your concert vibe: genres, arc, energy...",
    orderSourcePrefix: "Order source",
    dragHint: "Drag tracks to reorder.",
    versionLabel: "Version",
    saveConcert: "Save concert",
    llmReplyLabel: "LLM reply",
    llmReplyPlaceholder:
      "[Demo] Simulated model reply goes here — you should always see this box. Real copy is filled when the assistant message has text.",
    renameChat: "Rename chat",
    renameConcertVersion: "Rename this version",
    doubleClickToRename: "Double-click to rename",
  },
  ru: {
    hideChats: "Скрыть чаты",
    showChats: "Показать чаты",
    newChat: "Новый чат",
    searchChats: "Поиск по чатам",
    docs: "Документация",
    faq: "FAQ",
    untitled: "Без названия",
    today: "Сегодня",
    yesterday: "Вчера",
    twoDaysAgo: "Позавчера",
    daysAgo: (days) => `${days} дн. назад`,
    emptyInputPlaceholder: "Чем могу помочь сегодня?",
    defaultInputPlaceholder: "Опишите концертный вайб: жанры, дуга, энергия...",
    orderSourcePrefix: "Источник порядка",
    dragHint: "Перетаскивайте треки, чтобы изменить порядок.",
    versionLabel: "Версия",
    saveConcert: "Сохранить концерт",
    llmReplyLabel: "Ответ модели",
    llmReplyPlaceholder:
      "[Демо] Здесь показывается имитация ответа модели — блок всегда виден. Текст подставляется, когда в сообщении ассистента есть содержимое.",
    renameChat: "Переименовать чат",
    renameConcertVersion: "Переименовать эту версию",
    doubleClickToRename: "Дважды щёлкните, чтобы переименовать",
  },
  tr: {
    hideChats: "Sohbetleri gizle",
    showChats: "Sohbetleri göster",
    newChat: "Yeni sohbet",
    searchChats: "Sohbetlerde ara",
    docs: "Dokümantasyon",
    faq: "SSS",
    untitled: "İsimsiz",
    today: "Bugün",
    yesterday: "Dün",
    twoDaysAgo: "Dünden önceki gün",
    daysAgo: (days) => `${days} gün önce`,
    emptyInputPlaceholder: "Bugün size nasıl yardımcı olabilirim?",
    defaultInputPlaceholder: "Konser havasını anlatın: türler, akış, enerji...",
    orderSourcePrefix: "Sıra kaynağı",
    dragHint: "Sırayı değiştirmek için parçaları sürükleyin.",
    versionLabel: "Sürüm",
    saveConcert: "Konseri kaydet",
    llmReplyLabel: "LLM yanıtı",
    llmReplyPlaceholder:
      "[Demo] Örnek model yanıtı burada görünür. Asıl metin asistan mesajında içerik olduğunda doldurulur.",
    renameChat: "Sohbeti yeniden adlandır",
    renameConcertVersion: "Bu sürümü yeniden adlandır",
    doubleClickToRename: "Yeniden adlandırmak için çift tıklayın",
  },
  hi: {
    hideChats: "चैट छिपाएँ",
    showChats: "चैट दिखाएँ",
    newChat: "नई चैट",
    searchChats: "चैट खोजें",
    docs: "डॉक्यूमेंटेशन",
    faq: "FAQ",
    untitled: "बिना शीर्षक",
    today: "आज",
    yesterday: "कल",
    twoDaysAgo: "परसों",
    daysAgo: (days) => `${days} दिन पहले`,
    emptyInputPlaceholder: "आज मैं आपकी कैसे मदद करूं?",
    defaultInputPlaceholder: "कॉन्सर्ट वाइब बताएं: जॉनर, आर्क, एनर्जी...",
    orderSourcePrefix: "क्रम स्रोत",
    dragHint: "क्रम बदलने के लिए ट्रैक्स खींचें।",
    versionLabel: "संस्करण",
    saveConcert: "कॉन्सर्ट सहेजें",
    llmReplyLabel: "LLM उत्तर",
    llmReplyPlaceholder:
      "[डेमो] नकली मॉडल उत्तर यहाँ दिखेगा। असली टेक्स्ट तब भरता है जब सहायक संदेश में सामग्री हो।",
    renameChat: "चैट का नाम बदलें",
    renameConcertVersion: "इस संस्करण का नाम बदलें",
    doubleClickToRename: "नाम बदलने के लिए दो बार क्लिक करें",
  },
  zh: {
    hideChats: "隐藏聊天",
    showChats: "显示聊天",
    newChat: "新建聊天",
    searchChats: "搜索聊天",
    docs: "文档",
    faq: "常见问题",
    untitled: "未命名",
    today: "今天",
    yesterday: "昨天",
    twoDaysAgo: "前天",
    daysAgo: (days) => `${days} 天前`,
    emptyInputPlaceholder: "今天我可以帮你什么？",
    defaultInputPlaceholder: "描述你的演出氛围：风格、走向、能量...",
    orderSourcePrefix: "顺序来源",
    dragHint: "拖拽曲目即可调整顺序。",
    versionLabel: "版本",
    saveConcert: "保存演出",
    llmReplyLabel: "LLM 回复",
    llmReplyPlaceholder:
      "[演示] 模拟模型回复显示在此。助手消息有正文时会自动填入。",
    renameChat: "重命名聊天",
    renameConcertVersion: "重命名此版本",
    doubleClickToRename: "双击以重命名",
  },
  ur: {
    hideChats: "چیٹس چھپائیں",
    showChats: "چیٹس دکھائیں",
    newChat: "نئی چیٹ",
    searchChats: "چیٹس تلاش کریں",
    docs: "دستاویزات",
    faq: "FAQ",
    untitled: "بلا عنوان",
    today: "آج",
    yesterday: "کل",
    twoDaysAgo: "پرسوں",
    daysAgo: (days) => `${days} دن پہلے`,
    emptyInputPlaceholder: "آج میں آپ کی کیسے مدد کر سکتا ہوں؟",
    defaultInputPlaceholder: "کنسرٹ وائب بیان کریں: صنف، قوس، توانائی...",
    orderSourcePrefix: "ترتیب کا ماخذ",
    dragHint: "ترتیب بدلنے کے لیے ٹریکز گھسیٹیں۔",
    versionLabel: "ورژن",
    saveConcert: "کنسرٹ محفوظ کریں",
    llmReplyLabel: "LLM کا جواب",
    llmReplyPlaceholder:
      "[ڈیمو] ماڈل کا نمونہ جواب یہاں نظر آئے گا۔ معاون پیغام میں متن ہو تو اصل مواد بھرا جائے گا۔",
    renameChat: "چیٹ کا نام بدلیں",
    renameConcertVersion: "اس ورژن کا نام بدلیں",
    doubleClickToRename: "نام بدلنے کے لیے دو بار کلک کریں",
  },
  id: {
    hideChats: "Sembunyikan obrolan",
    showChats: "Tampilkan obrolan",
    newChat: "Obrolan baru",
    searchChats: "Cari obrolan",
    docs: "Dokumentasi",
    faq: "FAQ",
    untitled: "Tanpa judul",
    today: "Hari ini",
    yesterday: "Kemarin",
    twoDaysAgo: "Dua hari lalu",
    daysAgo: (days) => `${days} hari lalu`,
    emptyInputPlaceholder: "Bagaimana saya bisa membantu hari ini?",
    defaultInputPlaceholder: "Jelaskan vibe konser: genre, alur, energi...",
    orderSourcePrefix: "Sumber urutan",
    dragHint: "Seret lagu untuk mengubah urutan.",
    versionLabel: "Versi",
    saveConcert: "Simpan konser",
    llmReplyLabel: "Balasan LLM",
    llmReplyPlaceholder:
      "[Demo] Balasan model simulasi muncul di sini. Teks asli diisi jika pesan asisten berisi teks.",
    renameChat: "Ubah nama obrolan",
    renameConcertVersion: "Ubah nama versi ini",
    doubleClickToRename: "Klik dua kali untuk mengganti nama",
  },
  es: {
    hideChats: "Ocultar chats",
    showChats: "Mostrar chats",
    newChat: "Chat nuevo",
    searchChats: "Buscar en chats",
    docs: "Documentación",
    faq: "FAQ",
    untitled: "Sin título",
    today: "Hoy",
    yesterday: "Ayer",
    twoDaysAgo: "Anteayer",
    daysAgo: (days) => `Hace ${days} días`,
    emptyInputPlaceholder: "¿En qué puedo ayudarte hoy?",
    defaultInputPlaceholder: "Describe el vibe del concierto: géneros, arco, energía...",
    orderSourcePrefix: "Origen del orden",
    dragHint: "Arrastra las pistas para reordenar.",
    versionLabel: "Versión",
    saveConcert: "Guardar concierto",
    llmReplyLabel: "Respuesta del LLM",
    llmReplyPlaceholder:
      "[Demo] Aquí va la respuesta simulada del modelo. El texto real aparece cuando el mensaje del asistente tiene contenido.",
    renameChat: "Renombrar chat",
    renameConcertVersion: "Renombrar esta versión",
    doubleClickToRename: "Doble clic para renombrar",
  },
  de: {
    hideChats: "Chats ausblenden",
    showChats: "Chats anzeigen",
    newChat: "Neuer Chat",
    searchChats: "Chats durchsuchen",
    docs: "Dokumentation",
    faq: "FAQ",
    untitled: "Ohne Titel",
    today: "Heute",
    yesterday: "Gestern",
    twoDaysAgo: "Vorgestern",
    daysAgo: (days) => `vor ${days} Tagen`,
    emptyInputPlaceholder: "Womit kann ich dir heute helfen?",
    defaultInputPlaceholder: "Beschreibe den Konzert-Vibe: Genres, Spannungsbogen, Energie...",
    orderSourcePrefix: "Quelle der Reihenfolge",
    dragHint: "Tracks ziehen, um die Reihenfolge zu ändern.",
    versionLabel: "Version",
    saveConcert: "Konzert speichern",
    llmReplyLabel: "LLM-Antwort",
    llmReplyPlaceholder:
      "[Demo] Hier erscheint die simulierte Modellantwort. Echter Text wird gesetzt, wenn die Assistentennachricht Inhalt hat.",
    renameChat: "Chat umbenennen",
    renameConcertVersion: "Diese Version umbenennen",
    doubleClickToRename: "Doppelklick zum Umbenennen",
  },
};

function reorder(ids: string[], from: number, to: number): string[] {
  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function getTrackById(trackId: string) {
  return getCachedTrack(trackId) ?? mvpGetTrackById(trackId);
}

function pickHeadlineByChatId(chatId: string, headlines: readonly string[]): string {
  let hash = 0;
  for (let i = 0; i < chatId.length; i += 1) {
    hash = (hash * 31 + chatId.charCodeAt(i)) >>> 0;
  }
  return headlines[hash % headlines.length];
}

function sectionLabelByDay(iso: string, locale: Locale): string {
  const ui = CHAT_UI_TEXT[locale] ?? CHAT_UI_TEXT.en;
  const date = new Date(iso);
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const startCurrent = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.floor((startCurrent - startDate) / dayMs);
  if (diffDays <= 0) return ui.today;
  if (diffDays === 1) return ui.yesterday;
  if (diffDays === 2) return ui.twoDaysAgo;
  return ui.daysAgo(diffDays);
}

type ChevronDir = "left" | "right";

/** Merge full chat into a list of summary rows; prepend if id missing (stale list responses). */
function upsertFullIntoChatRows(rows: ChatRecord[], full: ChatRecord): ChatRecord[] {
  const i = rows.findIndex((r) => r.id === full.id);
  if (i === -1) return [full, ...rows];
  const next = [...rows];
  next[i] = full;
  return next;
}

function mergeSummariesWithFull(items: ChatRecord[], full: ChatRecord | null): ChatRecord[] {
  if (!full) return items;
  return upsertFullIntoChatRows(items, full);
}

function SidebarChevron({ direction }: { direction: ChevronDir }) {
  return (
    <span className={styles["btn-icon__glyph"]} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" xmlns="http://www.w3.org/2000/svg">
        {direction === "left" ? (
          <path
            d="M15 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </span>
  );
}

export function ChatPage({ locale }: ChatPageProps) {
  const navigate = useNavigate();
  const ui = CHAT_UI_TEXT[locale] ?? CHAT_UI_TEXT.en;
  const localizedHeadlines = EMPTY_CHAT_HEADLINES_BY_LOCALE[locale];
  const [searchParams, setSearchParams] = useSearchParams();
  const [chats, setChats] = useState<ChatRecord[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const activeChatIdRef = useRef<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [prompt, setPrompt] = useState("");
  const [viewConcertVersion, setViewConcertVersion] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [savedBump, setSavedBump] = useState(0);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [chatRenameDraft, setChatRenameDraft] = useState("");
  const [editingConcertLabel, setEditingConcertLabel] = useState(false);
  const [concertLabelDraft, setConcertLabelDraft] = useState("");

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!getSessionUser()) {
      void syncSessionFromApiMe()
        .then(() => {
          window.dispatchEvent(new Event("conce-auth-success"));
        })
        .catch(() => navigate("/auth", { replace: true }));
    }
  }, [navigate]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const items = await apiListChats();
      if (!alive) return;
      let pickId: string | null = null;
      setChats((prev) => {
        const serverIds = new Set(items.map((x) => x.id));
        const kept = prev.filter((p) => !serverIds.has(p.id));
        return [...kept, ...items];
      });
      setActiveChatId((cur) => {
        if (!cur) {
          pickId = items[0]?.id ?? null;
          return pickId;
        }
        if (items.some((x) => x.id === cur)) {
          pickId = cur;
          return cur;
        }
        pickId = cur;
        return cur;
      });
      if (pickId && alive) {
        const full = await apiLoadChatFull(pickId);
        if (!alive) return;
        if (full) {
          setChats((prev) => upsertFullIntoChatRows(prev, full));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const c = searchParams.get("c");
    if (!c) return;
    void (async () => {
      const items = await apiListChats();
      if (items.some((x) => x.id === c)) {
        setActiveChatId(c);
        setViewConcertVersion(null);
        const full = await apiLoadChatFull(c);
        if (full) {
          setChats((prev) => upsertFullIntoChatRows(prev, full));
        }
      }
      setSearchParams({}, { replace: true });
    })();
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!activeChatId) return;
    let cancelled = false;
    void (async () => {
      const full = await apiLoadChatFull(activeChatId);
      if (cancelled || !full) return;
      setChats((prev) => upsertFullIntoChatRows(prev, full));
    })();
    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [activeChatId, chats]
  );
  useEffect(() => {
    setViewConcertVersion(null);
  }, [activeChatId, activeChat?.concerts.length]);
  const isActiveChatEmpty = activeChat !== null && activeChat.messages.length === 0;
  const showCenteredEmptyState = !activeChat || isActiveChatEmpty;
  const emptyHeadline = useMemo(() => {
    if (!activeChat) return localizedHeadlines[0];
    return pickHeadlineByChatId(activeChat.id, localizedHeadlines);
  }, [activeChat, localizedHeadlines]);
  const activeConcert = useMemo(() => {
    const list = activeChat?.concerts;
    if (!list?.length) return null;
    if (viewConcertVersion === null) return list.at(-1) ?? null;
    return list.find((c) => c.version === viewConcertVersion) ?? list.at(-1) ?? null;
  }, [activeChat, viewConcertVersion]);
  useEffect(() => {
    setEditingConcertLabel(false);
  }, [activeChatId, activeChat?.concerts.length, activeConcert?.version]);
  const renderedOrder = activeConcert?.orderedTrackIds ?? [];
  const activeConcertSavedId =
    activeChat && activeConcert ? `${activeChat.id}:${activeConcert.version}` : null;
  const isActiveConcertSaved = useMemo(() => {
    if (!activeConcertSavedId) return false;
    return loadSavedConcertsFromStorage().some((item) => item.id === activeConcertSavedId);
  }, [activeConcertSavedId, savedBump]);
  const groupedChats = useMemo(() => {
    const filtered = chats.filter((chat) =>
      chat.title.toLowerCase().includes(search.trim().toLowerCase())
    );
    const map = new Map<string, ChatRecord[]>();
    for (const chat of filtered) {
      const label = sectionLabelByDay(chat.updatedAt, locale);
      const prev = map.get(label) ?? [];
      prev.push(chat);
      map.set(label, prev);
    }
    return [...map.entries()];
  }, [chats, locale, search]);

  function refresh(nextActiveId?: string): void {
    void (async () => {
      const items = await apiListChats();
      const targetId = nextActiveId ?? activeChatIdRef.current;
      let list: ChatRecord[] = items;
      if (targetId) {
        const full = await apiLoadChatFull(targetId);
        list = mergeSummariesWithFull(items, full);
      }
      setChats(list);
      if (nextActiveId) {
        setActiveChatId(nextActiveId);
        return;
      }
      const cur = activeChatIdRef.current;
      if (list.length > 0 && cur && !list.some((x) => x.id === cur)) {
        const nid = list[0].id;
        setActiveChatId(nid);
        const full2 = await apiLoadChatFull(nid);
        if (full2) {
          setChats((prev) => mergeSummariesWithFull(prev, full2));
        }
      }
    })();
  }

  function onCreateChat(): void {
    void (async () => {
      const created = await apiCreateChat();
      const full = await apiLoadChatFull(created.id);
      const row = full ?? created;
      const items = await apiListChats();
      const list = items.map((c) => (c.id === row.id ? row : c));
      if (!list.some((c) => c.id === row.id)) {
        list.unshift(row);
      }
      setChats(list);
      setActiveChatId(row.id);
      setViewConcertVersion(null);
    })();
  }

  function onDeleteChat(chatId: string): void {
    void (async () => {
      const didDelete = await apiDeleteChat(chatId);
      if (!didDelete) return;
      persistSavedConcerts(loadSavedConcertsFromStorage().filter((item) => item.chatId !== chatId));
      const items = await apiListChats();
      setChats(items);
      if (chatId === activeChatId) {
        const nid = items[0]?.id ?? null;
        setActiveChatId(nid);
        setViewConcertVersion(null);
        if (nid) {
          const full = await apiLoadChatFull(nid);
          if (full) {
            setChats((prev) => prev.map((c) => (c.id === full.id ? full : c)));
          }
        }
      }
    })();
  }

  function onSaveConcert(): void {
    if (!activeChat || !activeConcert) return;
    const id = `${activeChat.id}:${activeConcert.version}`;
    const prev = loadSavedConcertsFromStorage();
    if (prev.some((item) => item.id === id)) return;
    const nextItem = {
      id,
      chatId: activeChat.id,
      chatTitle: activeChat.title || ui.untitled,
      version: activeConcert.version,
      savedAt: new Date().toISOString(),
    };
    persistSavedConcerts([nextItem, ...prev].sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1)));
    setSavedBump((n) => n + 1);
  }

  function commitChatRename(): void {
    if (!renamingChatId) return;
    const id = renamingChatId;
    const trimmed = chatRenameDraft.trim();
    setRenamingChatId(null);
    void (async () => {
      if (!trimmed) {
        refresh();
        return;
      }
      const next = await apiPatchChatTitle(id, trimmed);
      if (next) {
        persistSavedConcerts(
          loadSavedConcertsFromStorage().map((item) =>
            item.chatId === id ? { ...item, chatTitle: next.title } : item
          )
        );
      }
      refresh();
    })();
  }

  function commitConcertLabel(): void {
    if (!activeChat || !activeConcert) return;
    void (async () => {
      await apiPatchConcertLabel(activeChat.id, activeConcert.version, concertLabelDraft);
      setEditingConcertLabel(false);
      refresh();
    })();
  }

  function onStartFromEmpty(): void {
    const text = prompt.trim();
    void (async () => {
      const created = await apiCreateChat();
      let targetId = created.id;
      if (text) {
        const next = await apiPostChatPrompt(created.id, text, locale);
        if (next) targetId = next.id;
      }
      refresh(targetId);
      setPrompt("");
      setViewConcertVersion(null);
    })();
  }

  function onSendPrompt(): void {
    if (!activeChat || !prompt.trim()) return;
    const chatId = activeChat.id;
    const text = prompt.trim();
    void (async () => {
      const next = await apiPostChatPrompt(chatId, text, locale);
      if (next) {
        refresh(next.id);
        setPrompt("");
        setViewConcertVersion(null);
      }
    })();
  }

  function onSubmitFromEmptyState(): void {
    if (activeChat) {
      onSendPrompt();
      return;
    }
    onStartFromEmpty();
  }

  return (
    <div className={styles["chat-page"]}>
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles["sidebar-open"] : styles["sidebar-closed"]}`}
      >
        <div className={styles["sidebar-top"]}>
          <button
            type="button"
            className={`${styles.btn} ${styles["btn-icon"]}`}
            aria-label={sidebarOpen ? ui.hideChats : ui.showChats}
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? ui.hideChats : ui.showChats}
          >
            <SidebarChevron direction={sidebarOpen ? "left" : "right"} />
          </button>
          {sidebarOpen ? (
            <button type="button" className={`${styles.btn} ${styles["new-chat-btn"]}`} onClick={onCreateChat}>
              {ui.newChat}
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.btn} ${styles["btn-icon"]}`}
              aria-label={ui.newChat}
              title={ui.newChat}
              onClick={onCreateChat}
            >
              <span className={styles["new-chat-icon"]} aria-hidden="true">
                +
              </span>
            </button>
          )}
        </div>

        {sidebarOpen && (
          <>
            <div className={styles["search-wrap"]}>
              <span className={styles["search-emoji"]} aria-hidden="true" title={ui.searchChats}>
                🔎
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={ui.searchChats}
                className={styles["search-input"]}
              />
            </div>
            <div className={styles["sidebar-links"]}>
              <a className={styles["sidebar-link"]} href="#/help">
                {ui.docs}
              </a>
              <a className={styles["sidebar-link"]} href="#/help">
                {ui.faq}
              </a>
            </div>

            <div className={styles["chat-groups"]}>
              {groupedChats.map(([label, items]) => (
                <section key={label} className={styles["chat-group"]}>
                  <h3 className={styles["group-title"]}>{label}</h3>
                  <ul className={styles["chat-list"]}>
                    {items.map((chat) => (
                      <li key={chat.id}>
                        <div className={styles["chat-item-row"]}>
                          {renamingChatId === chat.id ? (
                            <input
                              type="text"
                              className={styles["rename-input"]}
                              value={chatRenameDraft}
                              onChange={(e) => setChatRenameDraft(e.target.value)}
                              onBlur={commitChatRename}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitChatRename();
                                if (e.key === "Escape") {
                                  setRenamingChatId(null);
                                }
                              }}
                              autoFocus
                              aria-label={ui.renameChat}
                            />
                          ) : (
                            <button
                              type="button"
                              className={`${styles["chat-item-btn"]} ${chat.id === activeChatId ? styles.active : ""}`}
                              title={ui.doubleClickToRename}
                              onClick={() => {
                                setActiveChatId(chat.id);
                                setViewConcertVersion(null);
                              }}
                              onDoubleClick={(e) => {
                                e.preventDefault();
                                setRenamingChatId(chat.id);
                                setChatRenameDraft(chat.title || "");
                              }}
                            >
                              {chat.title || ui.untitled}
                            </button>
                          )}
                          <div className={styles["delete-item-wrap"]}>
                            <button
                              type="button"
                              className={styles["delete-item-btn"]}
                              aria-label="Delete chat"
                              onClick={() => onDeleteChat(chat.id)}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </aside>

      <section className={`${styles.content} ${styles.panel}`}>
        {showCenteredEmptyState ? (
          <div className={styles["empty-state"]}>
            <div className={styles["empty-shell"]}>
              <h1 className={styles["empty-title"]}>
                {emptyHeadline}
              </h1>
              <div className={`${styles.composer} ${styles["composer-centered"]}`}>
                <input
                  type="text"
                  value={prompt}
                  placeholder={ui.emptyInputPlaceholder}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSubmitFromEmptyState();
                  }}
                />
                <button
                  type="button"
                  className={`${styles.btn} ${styles["send-arrow"]}`}
                  onClick={onSubmitFromEmptyState}
                >
                  <span className={styles["send-arrow__icon"]} aria-hidden="true">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5 12h14M13 5l7 7-7 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.messages}>
              {activeChat.messages.map((m) =>
                m.role === "assistant" ? (
                  <div key={m.id} className={`${styles.bubble} ${styles.assistant}`}>
                    <div className={styles["bubble-llm-label"]}>{ui.llmReplyLabel}</div>
                    <div
                      className={`${styles["bubble-llm-field"]} ${!m.content.trim() ? styles["bubble-llm-field--empty"] : ""}`}
                    >
                      {m.content.trim() ? m.content : ui.llmReplyPlaceholder}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className={`${styles.bubble} ${styles.user}`}>
                    {m.content}
                  </div>
                )
              )}
              {activeChat.messages.length > 0 && activeChat.messages.at(-1)?.role === "user" && (
                <div className={`${styles.bubble} ${styles.assistant}`}>
                  <div className={styles["bubble-llm-label"]}>{ui.llmReplyLabel}</div>
                  <div className={`${styles["bubble-llm-field"]} ${styles["bubble-llm-field--empty"]}`}>
                    {ui.llmReplyPlaceholder}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.composer}>
              <input
                type="text"
                value={prompt}
                placeholder={ui.defaultInputPlaceholder}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSendPrompt();
                }}
              />
              <button type="button" className={`${styles.btn} ${styles["send-arrow"]}`} onClick={onSendPrompt}>
                <span className={styles["send-arrow__icon"]} aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 12h14M13 5l7 7-7 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            </div>

            {activeConcert && (
              <div className={styles.concert}>
                <div className={styles["concert-title-row"]}>
                  {editingConcertLabel ? (
                    <input
                      type="text"
                      className={styles["rename-input"]}
                      value={concertLabelDraft}
                      onChange={(e) => setConcertLabelDraft(e.target.value)}
                      onBlur={commitConcertLabel}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitConcertLabel();
                        if (e.key === "Escape") setEditingConcertLabel(false);
                      }}
                      autoFocus
                      placeholder={`${ui.versionLabel} ${activeConcert.version}`}
                      aria-label={ui.renameConcertVersion}
                    />
                  ) : (
                    <span
                      className={styles["dblclick-rename-target"]}
                      title={ui.doubleClickToRename}
                      role="group"
                      aria-label={ui.doubleClickToRename}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        setConcertLabelDraft(activeConcert.label ?? "");
                        setEditingConcertLabel(true);
                      }}
                    >
                      <strong>
                        {activeConcert.label ?? `${ui.versionLabel} ${activeConcert.version}`}
                      </strong>
                      {activeConcert.label ? (
                        <span className={styles.muted}>
                          {" "}
                          · v{activeConcert.version}
                        </span>
                      ) : null}
                    </span>
                  )}
                </div>
                <p className={styles.muted}>
                  {ui.orderSourcePrefix}: {activeConcert.orderSource === "optimizer" ? "optimizer" : "user"}.{" "}
                  {ui.dragHint}
                </p>
                <ul className={styles["track-list"]}>
                  {renderedOrder.map((trackId, idx) => {
                    const track = getTrackById(trackId);
                    if (!track) return null;
                    return (
                      <li
                        key={track.id}
                        className={styles["track-item"]}
                        draggable
                        onDragStart={() => setDragIndex(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragIndex === null || dragIndex === idx || !activeChat || !activeConcert) return;
                          const next = reorder(renderedOrder, dragIndex, idx);
                          void (async () => {
                            await apiPatchConcertOrder(activeChat.id, activeConcert.version, next);
                            refresh();
                            setDragIndex(null);
                          })();
                        }}
                      >
                        <span className={styles["track-num"]}>{idx + 1}</span>
                        <span className={styles["track-body"]}>
                          {track.title} - {track.artist}
                          <br />
                          <small>{track.uri}</small>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className={styles.history}>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={onSaveConcert}
                    disabled={isActiveConcertSaved}
                  >
                    {ui.saveConcert}
                  </button>
                  {activeChat.concerts.map((c) => {
                    const latest = activeChat.concerts.at(-1)?.version;
                    const isViewing =
                      viewConcertVersion === null ? c.version === latest : viewConcertVersion === c.version;
                    return (
                      <button
                        key={c.version}
                        type="button"
                        className={`${styles.btn} ${isViewing ? styles["version-btn-active"] : ""}`}
                        onClick={() => setViewConcertVersion(c.version)}
                        title={c.label ? `${c.label} (v${c.version})` : `v${c.version}`}
                      >
                        {c.label ?? `v${c.version}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <PoolSidebar locale={locale} activeChat={activeChat} onRefresh={() => refresh()} />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { type Locale } from "../../lib/i18n";
import styles from "./ChatPage.module.css";
import {
  createChat,
  getTrackById,
  listChats,
  sendUserPrompt,
  updateConcertOrder,
  type ChatRecord,
} from "../../lib/concertMvp";

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
    saveOrder: string;
    orderSourcePrefix: string;
    dragHint: string;
    versionLabel: string;
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
    saveOrder: "Save order",
    orderSourcePrefix: "Order source",
    dragHint: "Drag tracks and save the order.",
    versionLabel: "Version",
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
    saveOrder: "Сохранить порядок",
    orderSourcePrefix: "Источник порядка",
    dragHint: "Перетаскивайте треки и сохраните порядок.",
    versionLabel: "Версия",
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
    saveOrder: "Sırayı kaydet",
    orderSourcePrefix: "Sıra kaynağı",
    dragHint: "Parçaları sürükleyin ve sırayı kaydedin.",
    versionLabel: "Sürüm",
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
    saveOrder: "क्रम सहेजें",
    orderSourcePrefix: "क्रम स्रोत",
    dragHint: "ट्रैक्स को ड्रैग करें और क्रम सहेजें।",
    versionLabel: "संस्करण",
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
    saveOrder: "保存顺序",
    orderSourcePrefix: "顺序来源",
    dragHint: "拖拽曲目并保存顺序。",
    versionLabel: "版本",
  },
};

function reorder(ids: string[], from: number, to: number): string[] {
  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
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

export function ChatPage({ locale }: ChatPageProps) {
  const ui = CHAT_UI_TEXT[locale] ?? CHAT_UI_TEXT.en;
  const localizedHeadlines = locale === "ru" ? EMPTY_CHAT_HEADLINES_RU : EMPTY_CHAT_HEADLINES_EN;
  const [chats, setChats] = useState<ChatRecord[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [prompt, setPrompt] = useState("");
  const [draftOrder, setDraftOrder] = useState<string[] | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    const items = listChats();
    setChats(items);
    setActiveChatId(items[0]?.id ?? null);
  }, []);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [activeChatId, chats]
  );
  const isActiveChatEmpty = Boolean(activeChat) && activeChat.messages.length === 0;
  const showCenteredEmptyState = !activeChat || isActiveChatEmpty;
  const emptyHeadline = useMemo(() => {
    if (!activeChat) return localizedHeadlines[0];
    return pickHeadlineByChatId(activeChat.id, localizedHeadlines);
  }, [activeChat, localizedHeadlines]);
  const activeConcert = activeChat?.concerts.at(-1) ?? null;
  const renderedOrder = draftOrder ?? activeConcert?.orderedTrackIds ?? [];
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
    const items = listChats();
    setChats(items);
    if (nextActiveId) {
      setActiveChatId(nextActiveId);
      return;
    }
    if (items.length > 0 && !items.some((x) => x.id === activeChatId)) {
      setActiveChatId(items[0].id);
    }
  }

  function onCreateChat(): void {
    const created = createChat();
    refresh(created.id);
    setDraftOrder(null);
  }

  function onStartFromEmpty(): void {
    const text = prompt.trim();
    const created = createChat();
    let targetId = created.id;
    if (text) {
      const next = sendUserPrompt(created.id, text);
      if (next) targetId = next.id;
    }
    refresh(targetId);
    setPrompt("");
    setDraftOrder(null);
  }

  function onSendPrompt(): void {
    if (!activeChat || !prompt.trim()) return;
    const next = sendUserPrompt(activeChat.id, prompt.trim());
    if (next) {
      refresh(next.id);
      setPrompt("");
      setDraftOrder(null);
    }
  }

  function onSaveOrder(): void {
    if (!activeChat || !activeConcert || !draftOrder) return;
    const next = updateConcertOrder(activeChat.id, activeConcert.version, draftOrder);
    if (next) {
      refresh(next.id);
      setDraftOrder(null);
    }
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
            {sidebarOpen ? "◀" : "▶"}
          </button>
          {sidebarOpen && (
            <button type="button" className={`${styles.btn} ${styles["new-chat-btn"]}`} onClick={onCreateChat}>
              {ui.newChat}
            </button>
          )}
        </div>

        {sidebarOpen && (
          <>
            <div className={styles["search-wrap"]}>
              <span className={styles["search-icon"]} aria-hidden="true">
                🔍
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
                📄 {ui.docs}
              </a>
              <a className={styles["sidebar-link"]} href="#/help">
                ❓ {ui.faq}
              </a>
            </div>

            <div className={styles["chat-groups"]}>
              {groupedChats.map(([label, items]) => (
                <section key={label} className={styles["chat-group"]}>
                  <h3 className={styles["group-title"]}>{label}</h3>
                  <ul className={styles["chat-list"]}>
                    {items.map((chat) => (
                      <li key={chat.id}>
                        <button
                          type="button"
                          className={`${styles["chat-item-btn"]} ${chat.id === activeChatId ? styles.active : ""}`}
                          onClick={() => {
                            setActiveChatId(chat.id);
                            setDraftOrder(null);
                          }}
                        >
                          {chat.title || ui.untitled}
                        </button>
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
                <button
                  type="button"
                  className={`${styles.btn} ${styles["composer-plus"]}`}
                  aria-label={ui.newChat}
                  onClick={onCreateChat}
                >
                  +
                </button>
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
              {activeChat.messages.map((m) => (
                <div
                  key={m.id}
                  className={`${styles.bubble} ${m.role === "user" ? styles.user : styles.assistant}`}
                >
                  {m.content}
                </div>
              ))}
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
                <strong>
                  {ui.versionLabel} {activeConcert.version}
                </strong>
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
                          if (dragIndex === null || dragIndex === idx) return;
                          const next = reorder(renderedOrder, dragIndex, idx);
                          setDraftOrder(next);
                          setDragIndex(null);
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
                    onClick={onSaveOrder}
                    disabled={!draftOrder}
                  >
                    {ui.saveOrder}
                  </button>
                  {activeChat.concerts.map((c) => (
                    <button
                      key={c.version}
                      type="button"
                      className={styles.btn}
                      onClick={() => setDraftOrder(c.orderedTrackIds)}
                    >
                      v{c.version}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

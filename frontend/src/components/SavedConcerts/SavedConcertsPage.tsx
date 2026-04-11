import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { t, type Locale } from "../../lib/i18n";
import {
  loadSavedConcertsFromStorage,
  persistSavedConcerts,
  type SavedConcertItem,
} from "../../lib/savedConcertsMvp";
import layoutStyles from "../MainLayout.module.css";
import helpStyles from "../Help/HelpPage.module.css";
import chatStyles from "../Chat/ChatPage.module.css";
import neoStyles from "../NeoSurface.module.css";

type SavedConcertsPageProps = {
  locale: Locale;
};

export function SavedConcertsPage({ locale }: SavedConcertsPageProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<SavedConcertItem[]>([]);
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  useEffect(() => {
    setItems(loadSavedConcertsFromStorage());
  }, []);

  useEffect(() => {
    persistSavedConcerts(items);
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const label = item.displayName ?? `${item.chatTitle} - v${item.version}`;
      const hay = `${label} ${item.chatTitle} v${item.version}`.toLowerCase();
      return hay.includes(q) || String(item.version).includes(q);
    });
  }, [items, search]);

  function onDelete(id: string): void {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function commitRename(): void {
    if (!renamingId) return;
    const id = renamingId;
    const trimmed = renameDraft.trim();
    setRenamingId(null);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, displayName: trimmed || undefined } : item))
    );
  }

  return (
    <div className={helpStyles["help-page"]}>
      <h1 className={layoutStyles["page-title"]}>{t(locale, "nav_saved_concerts")}</h1>
      <p className={helpStyles["help-page__intro"]}>
        {t(locale, "saved_dblclick")} · {t(locale, "saved_open_chat")}
      </p>

      <div
        className={`${neoStyles["neo-surface"]} ${helpStyles["help-page__form-block"]}`}
        style={{ marginTop: "1rem", padding: "1rem 1.1rem" }}
      >
        <div className={chatStyles["search-wrap"]}>
          <span className={chatStyles["search-emoji"]} aria-hidden="true">
            🎼
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(locale, "saved_search_ph")}
            className={chatStyles["search-input"]}
            aria-label={t(locale, "saved_search_ph")}
          />
        </div>

        <ul className={chatStyles["chat-list"]} style={{ marginTop: "0.75rem" }}>
          {filtered.map((item) => (
            <li key={item.id}>
              <div className={chatStyles["chat-item-row"]}>
                {renamingId === item.id ? (
                  <input
                    type="text"
                    className={chatStyles["rename-input"]}
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    autoFocus
                    aria-label={t(locale, "saved_rename_aria")}
                  />
                ) : (
                  <button
                    type="button"
                    className={chatStyles["chat-item-btn"]}
                    title={t(locale, "saved_dblclick")}
                    onClick={() => navigate(`/chat?c=${encodeURIComponent(item.chatId)}`)}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      setRenamingId(item.id);
                      setRenameDraft(item.displayName ?? `${item.chatTitle} - v${item.version}`);
                    }}
                  >
                    {item.displayName ?? `${item.chatTitle} - v${item.version}`}
                  </button>
                )}
                <div className={chatStyles["delete-item-wrap"]}>
                  <button
                    type="button"
                    className={chatStyles["delete-item-btn"]}
                    aria-label="Delete"
                    onClick={() => onDelete(item.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {items.length === 0 && <p className={chatStyles.muted}>{t(locale, "saved_empty")}</p>}
        {items.length > 0 && filtered.length === 0 && (
          <p className={chatStyles.muted}>{t(locale, "saved_nomatch")}</p>
        )}
      </div>
    </div>
  );
}

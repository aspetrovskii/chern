export const SAVED_CONCERTS_STORAGE_KEY = "conce-mvp-saved-concerts-v1";

export type SavedConcertItem = {
  id: string;
  chatId: string;
  chatTitle: string;
  displayName?: string;
  version: number;
  savedAt: string;
};

export function loadSavedConcertsFromStorage(): SavedConcertItem[] {
  try {
    const raw = localStorage.getItem(SAVED_CONCERTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedConcertItem[]) : [];
  } catch {
    return [];
  }
}

export function persistSavedConcerts(items: SavedConcertItem[]): void {
  localStorage.setItem(SAVED_CONCERTS_STORAGE_KEY, JSON.stringify(items));
}

/**
 * Единый источник правды для mock REST `/api/v1/*` и офлайн-fallback в poolEditorMvp.
 */

export type MockPlaylistDef = {
  id: string;
  name: string;
  description?: string;
  /** Внутренние id треков (t001 …), как в каталоге concertMvp */
  trackIds: string[];
};

/** t001 … t100 — синхронно с расширенным TRACK_CATALOG в concertMvp */
export const MOCK_CATALOG_TRACK_IDS: string[] = Array.from({ length: 100 }, (_, i) => `t${String(i + 1).padStart(3, "0")}`);

export const MOCK_PLAYLIST_DEFINITIONS: MockPlaylistDef[] = [
  {
    id: "pl_night_drive",
    name: "Night Drive — synth & pulse",
    description: "Neon synths and steady night energy",
    trackIds: ["t001", "t008", "t013", "t003", "t010"],
  },
  {
    id: "pl_rock_live",
    name: "Arena rock & live energy",
    trackIds: ["t002", "t006", "t011", "t004", "t014"],
  },
  {
    id: "pl_chill_focus",
    name: "Chill focus pool",
    trackIds: ["t003", "t005", "t012", "t010", "t015"],
  },
  {
    id: "pl_festival",
    name: "Festival floor",
    trackIds: ["t007", "t009", "t004", "t013", "t002"],
  },
  {
    id: "pl_demo_100",
    name: "Conce — демо-плейлист (100 треков)",
    description: "Полный синтетический каталог для презентации без бэкенда",
    trackIds: [...MOCK_CATALOG_TRACK_IDS],
  },
];

export function findMockPlaylistDef(id: string): MockPlaylistDef | null {
  return MOCK_PLAYLIST_DEFINITIONS.find((p) => p.id === id) ?? null;
}

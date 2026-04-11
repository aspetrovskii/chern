const KEY = "conce-activity-by-day";

export type DayActivity = { p: number; v: number };

function read(): Record<string, DayActivity> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, DayActivity> = {};
    for (const [k, val] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
      if (val && typeof val === "object" && "p" in val && "v" in val) {
        const o = val as { p: unknown; v: unknown };
        const p = typeof o.p === "number" && o.p >= 0 ? Math.min(o.p, 999) : 0;
        const v = typeof o.v === "number" && o.v >= 0 ? Math.min(o.v, 99) : 0;
        out[k] = { p, v };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function write(data: Record<string, DayActivity>): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayKey(): string {
  return toLocalISODate(new Date());
}

export function recordChatPromptSent(): void {
  const t = todayKey();
  const d = read();
  const cur = d[t] ?? { p: 0, v: 0 };
  cur.p += 1;
  d[t] = cur;
  write(d);
  window.dispatchEvent(new Event("conce-profile-updated"));
}

/** Counts a chat session visit (capped per day in storage). */
export function recordChatVisit(): void {
  const t = todayKey();
  const d = read();
  const cur = d[t] ?? { p: 0, v: 0 };
  cur.v = Math.min(cur.v + 1, 20);
  d[t] = cur;
  write(d);
}

export function levelForDay(rec: DayActivity | undefined): 0 | 1 | 2 | 3 | 4 {
  if (!rec) return 0;
  const score = rec.p * 2 + Math.min(rec.v, 3);
  if (score <= 0) return 0;
  if (score <= 3) return 1;
  if (score <= 8) return 2;
  if (score <= 16) return 3;
  return 4;
}

export type HeatmapCell = { date: string; level: 0 | 1 | 2 | 3 | 4; future: boolean };

/** Columns left→right: older → newer; each column Mon→Sun (rows 0–6). */
export function getHeatmapColumns(weeks: number): HeatmapCell[][] {
  const byDay = read();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monday = new Date(today);
  const dow = monday.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  monday.setDate(monday.getDate() + diffToMon);

  const columns: HeatmapCell[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const col: HeatmapCell[] = [];
    const weekStart = new Date(monday);
    weekStart.setDate(weekStart.getDate() - w * 7);
    for (let day = 0; day < 7; day++) {
      const dt = new Date(weekStart);
      dt.setDate(dt.getDate() + day);
      const future = dt > today;
      const key = toLocalISODate(dt);
      const rec = byDay[key];
      const level = future ? 0 : levelForDay(rec);
      col.push({ date: key, level, future });
    }
    columns.push(col);
  }
  return columns;
}

export function getProfileStats(): {
  totalPrompts: number;
  activeDays: number;
  streak: number;
  firstActiveDate: string | null;
} {
  const d = read();
  let totalPrompts = 0;
  let activeDays = 0;
  for (const v of Object.values(d)) {
    totalPrompts += v.p;
    if (v.p > 0 || v.v > 0) activeDays += 1;
  }

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 730; i++) {
    const key = toLocalISODate(cursor);
    const rec = d[key];
    if (rec && (rec.p > 0 || rec.v > 0)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  const sortedKeys = Object.keys(d)
    .filter((k) => {
      const v = d[k];
      return v && (v.p > 0 || v.v > 0);
    })
    .sort();
  return {
    totalPrompts,
    activeDays,
    streak,
    firstActiveDate: sortedKeys[0] ?? null,
  };
}

/** Oldest → newest day, for charts. */
export function getPromptSeriesLastDays(days: number): { date: string; prompts: number }[] {
  const byDay = read();
  const out: { date: string; prompts: number }[] = [];
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const key = toLocalISODate(d);
    out.push({ date: key, prompts: byDay[key]?.p ?? 0 });
  }
  return out;
}

export function clearAllActivity(): void {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("conce-profile-updated"));
}

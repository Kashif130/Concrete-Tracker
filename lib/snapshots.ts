"use client";

// Client-only, localStorage-backed history so the app can show trend
// sparklines and a rough APY estimate without needing a backend database.
// This only sees data from whatever browser/device you use the app on —
// it's a convenience trend line built from your own visits, not a
// server-tracked history.

export type Snapshot = { t: number; v: number };

const MAX_POINTS = 60;

function readAll(): Record<string, Snapshot[]> {
  try {
    const raw = window.localStorage.getItem("concrete-tracker:snapshots");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, Snapshot[]>) {
  try {
    window.localStorage.setItem(
      "concrete-tracker:snapshots",
      JSON.stringify(data)
    );
  } catch {
    // Storage full or unavailable (private browsing) — trend history is a
    // nice-to-have, fail silently rather than breaking the app.
  }
}

/** Record a new data point for `key` (e.g. a vault address or "points:0xwallet") and return the updated history. */
export function recordSnapshot(key: string, value: number): Snapshot[] {
  const all = readAll();
  const series = all[key] ?? [];
  const now = Date.now();
  const last = series[series.length - 1];
  // Don't spam identical back-to-back points from rapid re-fetches.
  if (!last || now - last.t > 60_000 || last.v !== value) {
    series.push({ t: now, v: value });
  }
  all[key] = series.slice(-MAX_POINTS);
  writeAll(all);
  return all[key];
}

export function getHistory(key: string): Snapshot[] {
  return readAll()[key] ?? [];
}

/** Naive annualized rate of change between the oldest and newest snapshot. */
export function estimateApy(series: Snapshot[]): number | null {
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const days = (last.t - first.t) / (1000 * 60 * 60 * 24);
  if (days < 0.02 || first.v <= 0) return null; // need some real time gap
  const growth = last.v / first.v - 1;
  return growth * (365 / days);
}

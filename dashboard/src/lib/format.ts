const DEMO_NOW = new Date("2026-08-19T16:10:00Z").getTime();

/** The demo dataset is anchored to a fixed "now" so relative times stay stable. */
export function demoNow() {
  return DEMO_NOW;
}

export function formatRelative(timestamp: string): string {
  const diff = DEMO_NOW - new Date(timestamp).getTime();
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < minute) return "just now";
  if (abs < hour) return `${Math.round(abs / minute)}m ago`;
  if (abs < day) return `${Math.round(abs / hour)}h ago`;
  return `${Math.round(abs / day)}d ago`;
}

export function formatTimestamp(timestamp: string): string {
  const d = new Date(timestamp);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 19)} UTC`;
}

export function formatClock(timestamp: string): string {
  return new Date(timestamp).toISOString().slice(11, 19);
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function fileName(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] ?? path;
}

export function directoryOf(path: string): string {
  const idx = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return idx > 0 ? path.slice(0, idx) : path;
}

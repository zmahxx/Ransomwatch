import type {
  ActivityPoint,
  DetectionAlert,
  DetectionRule,
  EventType,
  MonitoredDirectory,
  OverviewMetrics,
  SecurityEvent,
  TimeRange,
} from "@/types/ransomwatch";

const NOW = new Date("2026-08-19T16:10:00Z").getTime();

const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

export const HOST_ID = "WIN-DEMO-01";

export const mockAlerts: DetectionAlert[] = [
  {
    id: "alert-001",
    rule_id: "RW002",
    title: "Rapid File Rename Burst",
    severity: "critical",
    status: "new",
    timestamp: "2026-08-19T15:42:17Z",
    description: "Many files were renamed in a short window, a common encryption pattern.",
    event_count: 8,
    window_seconds: 10,
    affected_paths: [
      "C:\\Users\\demo\\Documents\\report.docx.rw-simulated",
      "C:\\Users\\demo\\Documents\\budget.xlsx.rw-simulated",
      "C:\\Users\\demo\\Documents\\notes.txt.rw-simulated",
    ],
    evidence: {
      file_moved: 8,
    },
  },
  {
    id: "alert-002",
    rule_id: "RW001",
    title: "High-Rate File Mutation",
    severity: "high",
    status: "investigating",
    timestamp: iso(52 * 60 * 1000),
    description:
      "A burst of modify, move and delete operations exceeded the mutation threshold inside a user document tree.",
    event_count: 27,
    window_seconds: 10,
    affected_paths: [
      "C:\\Users\\demo\\Documents\\Q3\\forecast.xlsx",
      "C:\\Users\\demo\\Documents\\Q3\\summary.docx",
      "C:\\Users\\demo\\Documents\\Q3\\draft-notes.md",
      "C:\\Users\\demo\\Documents\\Q3\\archive.zip",
    ],
    evidence: { file_modified: 18, file_moved: 6, file_deleted: 3 },
  },
  {
    id: "alert-003",
    rule_id: "RW003",
    title: "Rapid File Deletion Burst",
    severity: "high",
    status: "acknowledged",
    timestamp: iso(3 * 60 * 60 * 1000),
    description:
      "Deletion volume in the shared drive exceeded the configured threshold for the detection window.",
    event_count: 14,
    window_seconds: 10,
    affected_paths: [
      "D:\\Shared\\Finance\\invoices\\INV-1042.pdf",
      "D:\\Shared\\Finance\\invoices\\INV-1043.pdf",
      "D:\\Shared\\Finance\\invoices\\INV-1044.pdf",
    ],
    evidence: { file_deleted: 14, collector: "watchdog" },
  },
  {
    id: "alert-004",
    rule_id: "RW001",
    title: "High-Rate File Mutation",
    severity: "medium",
    status: "resolved",
    timestamp: iso(9 * 60 * 60 * 1000),
    description:
      "Sustained modification activity matched a scheduled backup job. Confirmed benign by the analyst on shift.",
    event_count: 21,
    window_seconds: 10,
    affected_paths: [
      "D:\\Backups\\nightly\\chunk-0007.bin",
      "D:\\Backups\\nightly\\chunk-0008.bin",
    ],
    evidence: { file_modified: 21 },
  },
  {
    id: "alert-005",
    rule_id: "RW002",
    title: "Rapid File Rename Burst",
    severity: "critical",
    status: "dismissed",
    timestamp: iso(26 * 60 * 60 * 1000),
    description:
      "Rename burst originated from a bulk media re-tagging utility run by the workstation owner.",
    event_count: 9,
    window_seconds: 10,
    affected_paths: ["E:\\Media\\Photos\\2026-07\\IMG_0042.jpg"],
    evidence: { file_moved: 9 },
  },
  {
    id: "alert-006",
    rule_id: "RW003",
    title: "Rapid File Deletion Burst",
    severity: "medium",
    status: "new",
    timestamp: iso(5 * 60 * 60 * 1000),
    description:
      "Temporary build artifacts were removed rapidly. Volume was just above the deletion threshold.",
    event_count: 11,
    window_seconds: 10,
    affected_paths: ["C:\\Users\\demo\\AppData\\Local\\Temp\\build-cache"],
    evidence: { file_deleted: 11 },
  },
  {
    id: "alert-007",
    rule_id: "RW001",
    title: "High-Rate File Mutation",
    severity: "high",
    status: "new",
    timestamp: iso(4 * 24 * 60 * 60 * 1000),
    description:
      "Mixed mutation burst across a synced project directory during off hours with no matching change ticket.",
    event_count: 33,
    window_seconds: 10,
    affected_paths: [
      "C:\\Users\\demo\\Projects\\ransomwatch\\src\\detector.py",
      "C:\\Users\\demo\\Projects\\ransomwatch\\src\\collector.py",
    ],
    evidence: { file_modified: 25, file_deleted: 8 },
  },
  {
    id: "alert-008",
    rule_id: "RW002",
    title: "Rapid File Rename Burst",
    severity: "high",
    status: "investigating",
    timestamp: iso(2 * 24 * 60 * 60 * 1000),
    description:
      "Renames appended an unfamiliar extension to documents in a network share subfolder.",
    event_count: 10,
    window_seconds: 10,
    affected_paths: ["D:\\Shared\\HR\\policies\\handbook.docx.locked-demo"],
    evidence: { file_moved: 10, extension: ".locked-demo" },
  },
];

const EVENT_TYPES: EventType[] = ["file_created", "file_modified", "file_moved", "file_deleted"];

const PATHS = [
  "C:\\Users\\demo\\Documents",
  "C:\\Users\\demo\\Projects\\ransomwatch",
  "D:\\Shared\\Finance",
  "D:\\Shared\\HR",
  "E:\\Media\\Photos",
];

const FILES = [
  "report.docx",
  "budget.xlsx",
  "notes.txt",
  "forecast.xlsx",
  "handbook.docx",
  "detector.py",
  "collector.py",
  "IMG_0042.jpg",
  "invoice-1042.pdf",
  "summary.md",
];

/** Deterministic pseudo-random so the demo dataset is stable across renders. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function buildEvents(count: number): SecurityEvent[] {
  const rand = rng(20260819);
  const events: SecurityEvent[] = [];
  for (let i = 0; i < count; i += 1) {
    const inRenameBurst = i < 8;
    const type = inRenameBurst
      ? "file_moved"
      : EVENT_TYPES[Math.floor(rand() * EVENT_TYPES.length)]!;
    const dir = inRenameBurst ? PATHS[0]! : PATHS[Math.floor(rand() * PATHS.length)]!;
    const file = FILES[Math.floor(rand() * FILES.length)]!;
    const offset = inRenameBurst
      ? 28 * 60 * 1000 + i * 800
      : Math.floor(rand() * 7 * 24 * 60 * 60 * 1000);
    const path = `${dir}\\${file}`;
    events.push({
      event_id: `evt-${(i + 1).toString().padStart(5, "0")}`,
      event_type: type,
      timestamp: iso(offset),
      source: "filesystem",
      platform: "Windows",
      host_id: HOST_ID,
      collector_name: "polling-filesystem",
      path,
      ...(type === "file_moved" ? { destination_path: `${path}.rw-simulated` } : {}),
      metadata: {
        size_bytes: String(1024 + Math.floor(rand() * 4_000_000)),
        is_directory: "false",
        volume: dir.slice(0, 2),
      },
      schema_version: 1,
    });
  }
  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export const mockEvents: SecurityEvent[] = buildEvents(420);

export const mockDirectories: MonitoredDirectory[] = [
  {
    id: "dir-001",
    path: "C:\\Users\\demo\\Documents",
    status: "active",
    file_count: 8412,
    last_scan: iso(3 * 60 * 1000),
    recent_event_count: 486,
  },
  {
    id: "dir-002",
    path: "C:\\Users\\demo\\Projects\\ransomwatch",
    status: "active",
    file_count: 2190,
    last_scan: iso(2 * 60 * 1000),
    recent_event_count: 233,
  },
  {
    id: "dir-003",
    path: "D:\\Shared\\Finance",
    status: "active",
    file_count: 9051,
    last_scan: iso(6 * 60 * 1000),
    recent_event_count: 312,
  },
  {
    id: "dir-004",
    path: "D:\\Shared\\HR",
    status: "paused",
    file_count: 3120,
    last_scan: iso(4 * 60 * 60 * 1000),
    recent_event_count: 41,
    note: "Paused during scheduled HR archive migration.",
  },
  {
    id: "dir-005",
    path: "E:\\Media\\Photos",
    status: "error",
    file_count: 1907,
    last_scan: iso(11 * 60 * 60 * 1000),
    recent_event_count: 212,
    note: "Collector lost the volume handle: device not ready.",
  },
];

export const mockRules: DetectionRule[] = [
  {
    id: "RW001",
    name: "High-Rate File Mutation",
    description:
      "Flags a burst of modify, move or delete operations against distinct files. Bulk mutation at machine speed is the clearest early signal of an encryption routine walking a directory tree.",
    severity: "high",
    enabled: true,
    threshold: 20,
    threshold_label: "20 modified, moved or deleted files within 10 seconds",
    window_seconds: 10,
    cooldown_seconds: 10,
    event_types: ["file_modified", "file_moved", "file_deleted"],
  },
  {
    id: "RW002",
    name: "Rapid File Rename Burst",
    description:
      "Flags many renames inside one sliding window. Ransomware commonly rewrites a file and renames it with a new extension, producing dense rename bursts that users never generate by hand.",
    severity: "critical",
    enabled: true,
    threshold: 8,
    threshold_label: "8 renamed files within 10 seconds",
    window_seconds: 10,
    cooldown_seconds: 10,
    event_types: ["file_moved"],
  },
  {
    id: "RW003",
    name: "Rapid File Deletion Burst",
    description:
      "Flags rapid deletion volume, which can indicate destructive wiping or cleanup of original files after encrypted copies were written.",
    severity: "high",
    enabled: true,
    threshold: 10,
    threshold_label: "10 deleted files within 10 seconds",
    window_seconds: 10,
    cooldown_seconds: 10,
    event_types: ["file_deleted"],
  },
];

export const mockMetrics: OverviewMetrics = {
  threat_level: "Elevated",
  critical_alerts: 1,
  filesystem_events: 1284,
  monitored_files: 24680,
  trends: {
    critical_alerts: 1,
    filesystem_events: 18.4,
    monitored_files: 0.6,
  },
};

const RANGE_CONFIG: Record<TimeRange, { buckets: number; stepMs: number; format: "time" | "day" }> =
  {
    "1H": { buckets: 12, stepMs: 5 * 60 * 1000, format: "time" },
    "6H": { buckets: 12, stepMs: 30 * 60 * 1000, format: "time" },
    "24H": { buckets: 24, stepMs: 60 * 60 * 1000, format: "time" },
    "7D": { buckets: 14, stepMs: 12 * 60 * 60 * 1000, format: "day" },
  };

export function buildActivitySeries(range: TimeRange): ActivityPoint[] {
  const { buckets, stepMs, format } = RANGE_CONFIG[range];
  const rand = rng(range.length * 991 + buckets);
  const spikeIndex = buckets - 4;
  const points: ActivityPoint[] = [];

  for (let i = 0; i < buckets; i += 1) {
    const time = new Date(NOW - (buckets - 1 - i) * stepMs);
    const scale = stepMs / (5 * 60 * 1000);
    const isSpike = i === spikeIndex;
    points.push({
      timestamp: time.toISOString(),
      label:
        format === "time"
          ? time.toISOString().slice(11, 16)
          : `${time.toISOString().slice(5, 10)} ${time.toISOString().slice(11, 13)}h`,
      file_created: Math.round((4 + rand() * 6) * scale),
      file_modified: Math.round((9 + rand() * 12) * scale),
      file_moved: isSpike
        ? Math.round((38 + rand() * 8) * Math.max(1, scale * 0.6))
        : Math.round((1 + rand() * 3) * scale),
      file_deleted: Math.round((2 + rand() * 4) * scale),
      ...(isSpike ? { alert_id: "alert-001" } : {}),
    });
  }
  return points;
}

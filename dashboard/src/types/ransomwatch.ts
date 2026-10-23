export type Severity = "medium" | "high" | "critical";

export type AlertStatus = "new" | "investigating" | "acknowledged" | "resolved" | "dismissed";

export type RuleId = "RW001" | "RW002" | "RW003";

export interface DetectionAlert {
  id: string;
  rule_id: RuleId;
  title: string;
  severity: Severity;
  status: AlertStatus;
  timestamp: string;
  description: string;
  event_count: number;
  window_seconds: number;
  affected_paths: string[];
  evidence: Record<string, number | string>;
}

export type EventType = "file_created" | "file_modified" | "file_moved" | "file_deleted";

export interface SecurityEvent {
  event_id: string;
  event_type: EventType;
  timestamp: string;
  source: string;
  platform: string;
  host_id: string;
  collector_name: string;
  path?: string;
  destination_path?: string;
  process_id?: number;
  process_name?: string;
  metadata: Record<string, string>;
  schema_version: number;
}

export type DirectoryStatus = "active" | "paused" | "error";

export interface MonitoredDirectory {
  id: string;
  path: string;
  status: DirectoryStatus;
  file_count: number;
  last_scan: string;
  recent_event_count: number;
  note?: string;
}

export interface DetectionRule {
  id: RuleId;
  name: string;
  description: string;
  severity: Severity;
  enabled: boolean;
  threshold: number;
  threshold_label: string;
  window_seconds: number;
  cooldown_seconds: number;
  event_types: EventType[];
}

export type TimeRange = "1H" | "6H" | "24H" | "7D";

export interface ActivityPoint {
  /** ISO timestamp for the bucket */
  timestamp: string;
  label: string;
  file_created: number;
  file_modified: number;
  file_moved: number;
  file_deleted: number;
  /** id of a critical alert raised in this bucket, if any */
  alert_id?: string;
}

export interface OverviewMetrics {
  threat_level: "Low" | "Guarded" | "Elevated" | "Severe";
  critical_alerts: number;
  filesystem_events: number;
  monitored_files: number;
  trends: {
    critical_alerts: number;
    filesystem_events: number;
    monitored_files: number;
  };
}

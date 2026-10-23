import { AlertOctagon, AlertTriangle, ShieldAlert, type LucideIcon } from "lucide-react";
import type { AlertStatus, EventType, Severity } from "@/types/ransomwatch";

export const severityMeta: Record<
  Severity,
  { label: string; icon: LucideIcon; className: string; dot: string; order: number }
> = {
  medium: {
    label: "Medium",
    icon: AlertTriangle,
    className: "bg-sev-medium-soft text-sev-medium border-sev-medium/40",
    dot: "bg-sev-medium",
    order: 1,
  },
  high: {
    label: "High",
    icon: ShieldAlert,
    className: "bg-sev-high-soft text-sev-high border-sev-high/40",
    dot: "bg-sev-high",
    order: 2,
  },
  critical: {
    label: "Critical",
    icon: AlertOctagon,
    className: "bg-sev-critical-soft text-sev-critical border-sev-critical/50",
    dot: "bg-sev-critical",
    order: 3,
  },
};

export const statusMeta: Record<AlertStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-primary/15 text-primary border-primary/40" },
  investigating: {
    label: "Investigating",
    className: "bg-sev-medium-soft text-sev-medium border-sev-medium/40",
  },
  acknowledged: {
    label: "Acknowledged",
    className: "bg-secondary text-secondary-foreground border-border",
  },
  resolved: { label: "Resolved", className: "bg-ok-soft text-ok border-ok/40" },
  dismissed: { label: "Dismissed", className: "bg-muted text-muted-foreground border-border" },
};

export const eventTypeMeta: Record<
  EventType,
  { label: string; short: string; color: string; className: string }
> = {
  file_created: {
    label: "Created",
    short: "file_created",
    color: "var(--chart-1)",
    className: "text-[color:var(--chart-1)]",
  },
  file_modified: {
    label: "Modified",
    short: "file_modified",
    color: "var(--chart-2)",
    className: "text-[color:var(--chart-2)]",
  },
  file_moved: {
    label: "Renamed / Moved",
    short: "file_moved",
    color: "var(--chart-3)",
    className: "text-[color:var(--chart-3)]",
  },
  file_deleted: {
    label: "Deleted",
    short: "file_deleted",
    color: "var(--chart-4)",
    className: "text-[color:var(--chart-4)]",
  },
};

export const EVENT_TYPES: EventType[] = [
  "file_created",
  "file_modified",
  "file_moved",
  "file_deleted",
];
export const SEVERITIES: Severity[] = ["critical", "high", "medium"];
export const ALERT_STATUSES: AlertStatus[] = [
  "new",
  "investigating",
  "acknowledged",
  "resolved",
  "dismissed",
];

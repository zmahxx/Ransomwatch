import { Database, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { severityMeta, statusMeta } from "@/lib/severity";
import { USE_MOCK_DATA } from "@/services/ransomwatch-api";
import type { AlertStatus, DirectoryStatus, Severity } from "@/types/ransomwatch";

export function SeverityBadge({
  severity,
  className,
  showIcon = true,
}: {
  severity: Severity;
  className?: string;
  showIcon?: boolean;
}) {
  const meta = severityMeta[severity];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide",
        meta.className,
        className,
      )}
    >
      {showIcon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
      {meta.label}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: AlertStatus; className?: string }) {
  const meta = statusMeta[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

const dirMeta: Record<DirectoryStatus, { label: string; className: string; dot: string }> = {
  active: { label: "Active", className: "bg-ok-soft text-ok border-ok/40", dot: "bg-ok" },
  paused: {
    label: "Paused",
    className: "bg-sev-medium-soft text-sev-medium border-sev-medium/40",
    dot: "bg-sev-medium",
  },
  error: {
    label: "Error",
    className: "bg-sev-critical-soft text-sev-critical border-sev-critical/50",
    dot: "bg-sev-critical",
  },
};

export function DirectoryStatusBadge({
  status,
  className,
}: {
  status: DirectoryStatus;
  className?: string;
}) {
  const meta = dirMeta[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        meta.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function DemoDataBadge({ className }: { className?: string }) {
  const Icon = USE_MOCK_DATA ? Database : Radio;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground",
        className,
      )}
      title={
        USE_MOCK_DATA
          ? "This dashboard is running on a local demo dataset, not a live detector feed."
          : "This dashboard is connected to the local RansomWatch detector API."
      }
    >
      <Icon className="size-3" aria-hidden="true" />
      {USE_MOCK_DATA ? "Demo Data" : "Live Data"}
    </span>
  );
}

import { ChevronDown, FileWarning, Info } from "lucide-react";
import { useState } from "react";
import { SeverityBadge, StatusBadge } from "@/components/common/badges";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatNumber, formatRelative, formatTimestamp } from "@/lib/format";
import { eventTypeMeta } from "@/lib/severity";
import { cn } from "@/lib/utils";
import type { DetectionAlert, DetectionRule, EventType } from "@/types/ransomwatch";

export const ATTRIBUTION_DISCLAIMER =
  "Behavioral detection indicates suspicious activity but does not prove ransomware attribution.";

export function AlertDisclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2 text-xs text-muted-foreground",
        className,
      )}
    >
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{ATTRIBUTION_DISCLAIMER}</span>
    </p>
  );
}

export function ThresholdMeter({ alert, rule }: { alert: DetectionAlert; rule?: DetectionRule }) {
  const threshold = rule?.threshold ?? alert.event_count;
  const pct = Math.min(100, Math.round((alert.event_count / Math.max(threshold, 1)) * 100));
  return (
    <div className="panel p-4">
      <h3 className="text-sm font-semibold">Threshold vs. observed</h3>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-sev-critical">
            {formatNumber(alert.event_count)}
          </p>
          <p className="text-xs text-muted-foreground">observed events</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums text-muted-foreground">
            {formatNumber(threshold)}
          </p>
          <p className="text-xs text-muted-foreground">rule threshold</p>
        </div>
      </div>
      <Progress
        value={pct}
        className="mt-3 h-2"
        aria-label={`Observed ${alert.event_count} of threshold ${threshold}`}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        {Math.round((alert.event_count / Math.max(threshold, 1)) * 100)}% of threshold in a{" "}
        {alert.window_seconds}s sliding window.
      </p>
    </div>
  );
}

export function WindowTimeline({ alert }: { alert: DetectionAlert }) {
  const start = new Date(new Date(alert.timestamp).getTime() - alert.window_seconds * 1000);
  const ticks = Array.from({ length: alert.window_seconds }, (_, i) => i);

  // Deterministic distribution of the observed events across the window.
  const weights = ticks.map((t) => 0.4 + ((t * 7) % 10) / 10);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) => Math.round((w / weightSum) * alert.event_count));
  const maxCount = Math.max(1, ...counts);

  return (
    <div className="panel p-4">
      <h3 className="text-sm font-semibold">Detection window timeline</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {start.toISOString().slice(11, 19)} →{" "}
        {new Date(alert.timestamp).toISOString().slice(11, 19)} UTC ({alert.window_seconds}s)
      </p>
      <div
        className="mt-4 flex h-28 items-end gap-1.5"
        role="img"
        aria-label={`Events per second within the ${alert.window_seconds} second detection window, peaking at ${maxCount} events`}
      >
        {ticks.map((t) => {
          const count = counts[t] ?? 0;
          const px = count === 0 ? 3 : Math.max(10, Math.round((count / maxCount) * 84));
          return (
            <div key={t} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] tabular-nums text-muted-foreground">{count}</span>
              <div
                className={
                  count === 0
                    ? "w-full rounded-sm bg-border"
                    : "w-full rounded-sm bg-sev-critical/70"
                }
                style={{ height: `${px}px` }}
                title={`t+${t}s · ${count} events`}
              />
              <span className="text-[10px] tabular-nums text-muted-foreground">{t}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EvidenceBreakdown({ alert }: { alert: DetectionAlert }) {
  const numeric = Object.entries(alert.evidence).filter(([, v]) => typeof v === "number") as Array<
    [string, number]
  >;
  const other = Object.entries(alert.evidence).filter(([, v]) => typeof v !== "number");
  const max = Math.max(1, ...numeric.map(([, v]) => v));

  return (
    <div className="panel p-4">
      <h3 className="text-sm font-semibold">Event type breakdown</h3>
      <ul className="mt-3 space-y-2.5">
        {numeric.map(([key, value]) => {
          const meta = eventTypeMeta[key as EventType];
          return (
            <li key={key}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">{key}</span>
                <span className="tabular-nums font-medium">{value}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(value / max) * 100}%`,
                    backgroundColor: meta?.color ?? "var(--primary)",
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {other.length ? (
        <>
          <Separator className="my-3" />
          <dl className="space-y-1 text-xs">
            {other.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3">
                <dt className="font-mono text-muted-foreground">{key}</dt>
                <dd className="truncate font-medium">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </div>
  );
}

export function AffectedPaths({ paths }: { paths: string[] }) {
  return (
    <div className="panel p-4">
      <h3 className="text-sm font-semibold">Affected paths ({paths.length})</h3>
      <ul className="mt-3 space-y-1.5">
        {paths.map((p) => (
          <li
            key={p}
            className="flex items-start gap-2 rounded-md bg-secondary/50 px-2.5 py-1.5 font-mono text-xs"
          >
            <FileWarning className="mt-0.5 size-3.5 shrink-0 text-sev-medium" aria-hidden="true" />
            <span className="break-all">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RawJsonPanel({ alert }: { alert: DetectionAlert }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold hover:bg-accent/50"
      >
        Raw alert JSON
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <pre className="max-h-96 overflow-auto border-t border-border bg-background/60 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
          {JSON.stringify(alert, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

export function AlertSummaryHeader({
  alert,
  rule,
}: {
  alert: DetectionAlert;
  rule?: DetectionRule;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={alert.severity} />
        <StatusBadge status={alert.status} />
        <span className="rounded-md border border-border bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
          {alert.rule_id}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatTimestamp(alert.timestamp)} · {formatRelative(alert.timestamp)}
        </span>
      </div>
      <h2 className="text-lg font-semibold tracking-tight">{alert.title}</h2>
      <p className="text-sm text-muted-foreground">{alert.description}</p>
      <div className="rounded-md border border-border bg-secondary/40 p-3 text-sm">
        <p className="font-medium">Why this rule triggered</p>
        <p className="mt-1 text-muted-foreground">
          {rule
            ? `${rule.id} (${rule.name}) fires when at least ${rule.threshold} ${rule.event_types
                .map((t) => eventTypeMeta[t].label.toLowerCase())
                .join(", ")} events occur within ${rule.window_seconds} seconds. `
            : ""}
          The detector observed {alert.event_count} qualifying events in a {alert.window_seconds}
          -second sliding window across {alert.affected_paths.length} recorded path
          {alert.affected_paths.length === 1 ? "" : "s"}, exceeding the configured threshold.
        </p>
      </div>
    </div>
  );
}

export function AlertActions({
  alert,
  onStatus,
  compact = false,
}: {
  alert: DetectionAlert;
  onStatus: (status: DetectionAlert["status"]) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size={compact ? "sm" : "default"}
        onClick={() => onStatus("acknowledged")}
        disabled={alert.status === "acknowledged"}
      >
        Acknowledge
      </Button>
      {!compact ? (
        <Button
          variant="outline"
          onClick={() => onStatus("resolved")}
          disabled={alert.status === "resolved"}
        >
          Resolve
        </Button>
      ) : null}
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        onClick={() => onStatus("dismissed")}
        disabled={alert.status === "dismissed"}
      >
        Dismiss
      </Button>
    </div>
  );
}

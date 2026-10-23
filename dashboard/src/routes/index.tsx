import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Activity, AlertOctagon, Files, Gauge, ArrowUpRight } from "lucide-react";
import {
  DemoDataBadge,
  DirectoryStatusBadge,
  SeverityBadge,
  StatusBadge,
} from "@/components/common/badges";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/common/state-blocks";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { EventBreakdown } from "@/components/dashboard/event-breakdown";
import { StatCard } from "@/components/dashboard/stat-card";
import { useTimeRange } from "@/components/layout/time-range";
import { Button } from "@/components/ui/button";
import { formatNumber, formatRelative } from "@/lib/format";
import { ransomwatchApi } from "@/services/ransomwatch-api";
import { useRansomwatchStore } from "@/store/ransomwatch-store";
import type { TimeRange } from "@/types/ransomwatch";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — RansomWatch Security Console" },
      {
        name: "description",
        content:
          "Live overview of filesystem activity, threat level and ransomware behavioral detections monitored by RansomWatch.",
      },
      { property: "og:title", content: "Overview — RansomWatch Security Console" },
      {
        property: "og:description",
        content:
          "Threat level, critical alerts, filesystem event volume and monitored directory health in one analyst view.",
      },
    ],
  }),
  component: OverviewPage,
});

const RANGES: TimeRange[] = ["1H", "6H", "24H", "7D"];

function OverviewPage() {
  const { range, setRange } = useTimeRange();
  const { applyStatuses } = useRansomwatchStore();

  const metrics = useQuery({
    queryKey: ["metrics"],
    queryFn: ransomwatchApi.getOverviewMetrics,
    retry: false,
  });
  const series = useQuery({
    queryKey: ["activity-series", range],
    queryFn: () => ransomwatchApi.getActivitySeries(range),
    retry: false,
  });
  const alertsQuery = useQuery({
    queryKey: ["alerts"],
    queryFn: ransomwatchApi.getAlerts,
    retry: false,
  });
  const dirs = useQuery({
    queryKey: ["directories"],
    queryFn: ransomwatchApi.getDirectories,
    retry: false,
  });

  const alerts = applyStatuses(alertsQuery.data ?? []);
  const critical = alerts.find((a) => a.severity === "critical" && a.status === "new");
  const recent = [...alerts].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5);

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      {critical ? (
        <section
          aria-labelledby="critical-alert-heading"
          className="panel border-sev-critical/50 bg-sev-critical-soft p-4"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-sev-critical/20 text-sev-critical">
                <AlertOctagon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="critical-alert-heading" className="text-sm font-semibold">
                    Active critical alert · {critical.rule_id}
                  </h2>
                  <SeverityBadge severity={critical.severity} />
                </div>
                <p className="mt-1 text-sm text-foreground">{critical.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {critical.event_count} events in {critical.window_seconds}s ·{" "}
                  {formatRelative(critical.timestamp)} · {critical.affected_paths.length} affected
                  paths
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to="/alerts/$id" params={{ id: critical.id }}>
                Investigate
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      <section aria-label="Summary metrics">
        {metrics.isPending ? (
          <div className="panel">
            <LoadingBlock rows={3} />
          </div>
        ) : metrics.isError ? (
          <div className="panel">
            <ErrorBlock error={metrics.error} onRetry={() => metrics.refetch()} />
          </div>
        ) : metrics.data ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Threat Level"
              value={metrics.data.threat_level}
              icon={Gauge}
              tone="warning"
              trend={{ value: "Raised from Guarded", direction: "up", good: false }}
              hint="Composite of open critical alerts, rule hit rate and directory health."
            />
            <StatCard
              label="Critical Alerts"
              value={formatNumber(metrics.data.critical_alerts)}
              icon={AlertOctagon}
              tone="critical"
              trend={{ value: "+1 in 24h", direction: "up", good: false }}
              footnote="unresolved"
            />
            <StatCard
              label="Filesystem Events"
              value={formatNumber(metrics.data.filesystem_events)}
              icon={Activity}
              tone="primary"
              trend={{ value: `+${metrics.data.trends.filesystem_events}%`, direction: "up" }}
              footnote="last 24h"
            />
            <StatCard
              label="Monitored Files"
              value={formatNumber(metrics.data.monitored_files)}
              icon={Files}
              trend={{
                value: `+${metrics.data.trends.monitored_files}%`,
                direction: "up",
                good: true,
              }}
              footnote={`across ${dirs.data?.length ?? 0} monitored director${dirs.data?.length === 1 ? "y" : "ies"}`}
            />
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="panel p-4" aria-labelledby="activity-heading">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
            <div className="min-w-0">
              <h2 id="activity-heading" className="truncate text-sm font-semibold">
                Filesystem Activity
              </h2>
              <p className="truncate text-xs text-muted-foreground">
                Events per bucket by type · last {range}
              </p>
            </div>
            <div
              className="flex shrink-0 rounded-md border border-border bg-surface p-0.5"
              role="group"
              aria-label="Chart time range"
            >
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  aria-pressed={range === r}
                  className={
                    range === r
                      ? "rounded-[5px] bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
                      : "rounded-[5px] px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {series.isPending ? (
            <LoadingBlock rows={4} />
          ) : series.isError ? (
            <ErrorBlock error={series.error} onRetry={() => series.refetch()} />
          ) : (
            <ActivityChart data={series.data ?? []} />
          )}
        </section>

        <section className="panel p-4" aria-labelledby="breakdown-heading">
          <h2 id="breakdown-heading" className="text-sm font-semibold">
            Event Breakdown
          </h2>
          <p className="text-xs text-muted-foreground">Share of events by type · last {range}</p>
          <div className="mt-3">
            {series.isPending ? (
              <LoadingBlock rows={4} />
            ) : series.isError ? (
              <ErrorBlock error={series.error} onRetry={() => series.refetch()} />
            ) : (
              <EventBreakdown data={series.data ?? []} />
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="panel" aria-labelledby="recent-heading">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 id="recent-heading" className="text-sm font-semibold">
              Recent Alerts
            </h2>
            <div className="flex items-center gap-2">
              <DemoDataBadge />
              <Button variant="ghost" size="sm" asChild>
                <Link to="/alerts">View all</Link>
              </Button>
            </div>
          </div>
          {alertsQuery.isPending ? (
            <LoadingBlock />
          ) : alertsQuery.isError ? (
            <ErrorBlock error={alertsQuery.error} onRetry={() => alertsQuery.refetch()} />
          ) : recent.length === 0 ? (
            <EmptyBlock
              title="No alerts yet"
              description="The detector has not raised any alerts."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Five most recent detection alerts</caption>
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th scope="col" className="px-4 py-2 font-medium">
                      Severity
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Rule
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Alert
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium text-right">
                      Events
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Detected
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-border/60 last:border-0 hover:bg-accent/40"
                    >
                      <td className="px-4 py-2.5">
                        <SeverityBadge severity={a.severity} />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {a.rule_id}
                      </td>
                      <td className="max-w-[280px] px-4 py-2.5">
                        <Link
                          to="/alerts/$id"
                          params={{ id: a.id }}
                          className="block truncate font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {a.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{a.event_count}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {formatRelative(a.timestamp)}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={a.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel" aria-labelledby="dirs-heading">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 id="dirs-heading" className="text-sm font-semibold">
              Monitored Directories
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/directories">Manage</Link>
            </Button>
          </div>
          {dirs.isPending ? (
            <LoadingBlock rows={4} />
          ) : dirs.isError ? (
            <ErrorBlock error={dirs.error} onRetry={() => dirs.refetch()} />
          ) : (
            <ul className="divide-y divide-border">
              {(dirs.data ?? []).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-foreground">{d.path}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatNumber(d.file_count)} files · scanned {formatRelative(d.last_scan)}
                    </p>
                  </div>
                  <DirectoryStatusBadge status={d.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

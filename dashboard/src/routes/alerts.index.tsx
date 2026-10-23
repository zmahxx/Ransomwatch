import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AffectedPaths,
  AlertActions,
  AlertDisclaimer,
  AlertSummaryHeader,
  EvidenceBreakdown,
  RawJsonPanel,
  ThresholdMeter,
} from "@/components/alerts/alert-detail";
import { DemoDataBadge, SeverityBadge, StatusBadge } from "@/components/common/badges";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/common/state-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { directoryOf, formatRelative, formatTimestamp } from "@/lib/format";
import { ALERT_STATUSES, SEVERITIES } from "@/lib/severity";
import { ransomwatchApi, rangeToMs } from "@/services/ransomwatch-api";
import { useRansomwatchStore } from "@/store/ransomwatch-store";
import type { AlertStatus, DetectionAlert, TimeRange } from "@/types/ransomwatch";
import { demoNow } from "@/lib/format";

interface AlertsSearch {
  q?: string;
}

export const Route = createFileRoute("/alerts/")({
  validateSearch: (search: Record<string, unknown>): AlertsSearch =>
    typeof search["q"] === "string" && search["q"] ? { q: search["q"] } : {},
  head: () => ({
    meta: [
      { title: "Alerts — RansomWatch Security Console" },
      {
        name: "description",
        content:
          "Triage ransomware behavioral detections: filter by severity, status, rule and directory, then acknowledge or dismiss alerts.",
      },
      { property: "og:title", content: "Alerts — RansomWatch Security Console" },
      {
        property: "og:description",
        content: "Searchable, filterable alert queue for RansomWatch behavioral detections.",
      },
    ],
  }),
  component: AlertsPage,
});

const PAGE_SIZE = 6;
const RANGE_OPTIONS: Array<TimeRange | "ALL"> = ["1H", "6H", "24H", "7D", "ALL"];

interface Filters {
  severity: string;
  status: string;
  rule: string;
  directory: string;
  range: TimeRange | "ALL";
}

const DEFAULT_FILTERS: Filters = {
  severity: "all",
  status: "all",
  rule: "all",
  directory: "all",
  range: "ALL",
};

function AlertsPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const { applyStatuses, setAlertStatus } = useRansomwatchStore();
  const [filters, setFilters] = useLocalStorage<Filters>("rw.alertFilters", DEFAULT_FILTERS);
  const [search, setSearch] = useState(q ?? "");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DetectionAlert | null>(null);

  useEffect(() => {
    if (q !== undefined) setSearch(q);
  }, [q]);

  const alertsQuery = useQuery({
    queryKey: ["alerts"],
    queryFn: ransomwatchApi.getAlerts,
    retry: false,
  });
  const rulesQuery = useQuery({
    queryKey: ["rules"],
    queryFn: ransomwatchApi.getRules,
    retry: false,
  });
  const dirsQuery = useQuery({
    queryKey: ["directories"],
    queryFn: ransomwatchApi.getDirectories,
    retry: false,
  });

  const alerts = applyStatuses(alertsQuery.data ?? []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return alerts
      .filter((a) => {
        if (filters.severity !== "all" && a.severity !== filters.severity) return false;
        if (filters.status !== "all" && a.status !== filters.status) return false;
        if (filters.rule !== "all" && a.rule_id !== filters.rule) return false;
        if (
          filters.directory !== "all" &&
          !a.affected_paths.some((p) => p.startsWith(filters.directory))
        )
          return false;
        if (filters.range !== "ALL") {
          const cutoff = demoNow() - rangeToMs[filters.range];
          if (new Date(a.timestamp).getTime() < cutoff) return false;
        }
        if (!term) return true;
        return (
          a.title.toLowerCase().includes(term) ||
          a.description.toLowerCase().includes(term) ||
          a.rule_id.toLowerCase().includes(term) ||
          a.affected_paths.some((p) => p.toLowerCase().includes(term))
        );
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [alerts, filters, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeFilterCount =
    Object.entries(filters).filter(([k, v]) => v !== DEFAULT_FILTERS[k as keyof Filters]).length +
    (search ? 1 : 0);

  function updateStatus(alert: DetectionAlert, status: AlertStatus) {
    setAlertStatus(alert.id, status);
    setSelected((prev) => (prev && prev.id === alert.id ? { ...prev, status } : prev));
    toast.success(`Alert ${alert.id} marked ${status}`, {
      description: "Saved locally in this browser — the detector API is not connected yet.",
    });
  }

  const selectedRule = rulesQuery.data?.find((r) => r.id === selected?.rule_id);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <section className="panel p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">Alert queue</h2>
            <p className="truncate text-xs text-muted-foreground">
              {filtered.length} of {alerts.length} alerts match the current filters
            </p>
          </div>
          <DemoDataBadge />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
                navigate({ to: "/alerts", search: e.target.value ? { q: e.target.value } : {} });
              }}
              placeholder="Search title, rule, description or path…"
              aria-label="Search alerts"
              className="bg-surface pl-8"
            />
          </div>

          <FilterSelect
            label="Severity"
            value={filters.severity}
            onChange={(v) => {
              setFilters((f) => ({ ...f, severity: v }));
              setPage(1);
            }}
            options={SEVERITIES.map((s) => ({ value: s, label: s }))}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(v) => {
              setFilters((f) => ({ ...f, status: v }));
              setPage(1);
            }}
            options={ALERT_STATUSES.map((s) => ({ value: s, label: s }))}
          />
          <FilterSelect
            label="Rule"
            value={filters.rule}
            onChange={(v) => {
              setFilters((f) => ({ ...f, rule: v }));
              setPage(1);
            }}
            options={(rulesQuery.data ?? []).map((r) => ({
              value: r.id,
              label: `${r.id} ${r.name}`,
            }))}
          />
          <FilterSelect
            label="Directory"
            value={filters.directory}
            onChange={(v) => {
              setFilters((f) => ({ ...f, directory: v }));
              setPage(1);
            }}
            options={(dirsQuery.data ?? []).map((d) => ({ value: d.path, label: d.path }))}
          />
          <Select
            value={filters.range}
            onValueChange={(v) => {
              setFilters((f) => ({ ...f, range: v as TimeRange | "ALL" }));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[130px] bg-surface" aria-label="Filter by time range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r === "ALL" ? "All time" : `Last ${r}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeFilterCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                setSearch("");
                setPage(1);
                navigate({ to: "/alerts", search: {} });
              }}
            >
              <X className="size-4" aria-hidden="true" />
              Clear ({activeFilterCount})
            </Button>
          ) : null}
        </div>
      </section>

      <section className="panel overflow-hidden">
        {alertsQuery.isPending ? (
          <LoadingBlock rows={6} />
        ) : alertsQuery.isError ? (
          <ErrorBlock error={alertsQuery.error} onRetry={() => alertsQuery.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyBlock
            title="No alerts match these filters"
            description="Try widening the time range or clearing severity and status filters."
            action={
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setSearch("");
                }}
              >
                Reset filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Detection alerts. Activate a row to open details.
              </caption>
              <thead>
                <tr className="border-b border-border bg-surface/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Severity
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Rule
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Alert
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Directory
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Event Count
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Detected
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr
                    key={a.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open details for ${a.title}`}
                    onClick={() => setSelected(a)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(a);
                      }
                    }}
                    className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-accent/40 focus:bg-accent/60"
                  >
                    <td className="px-4 py-3">
                      <SeverityBadge severity={a.severity} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {a.rule_id}
                    </td>
                    <td className="max-w-[300px] px-4 py-3">
                      <p className="truncate font-medium">{a.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.description}</p>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {a.affected_paths[0] ? directoryOf(a.affected_paths[0]) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{a.event_count}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      <span title={formatTimestamp(a.timestamp)}>
                        {formatRelative(a.timestamp)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 ? (
          <nav
            className="flex items-center justify-between gap-3 border-t border-border px-4 py-3"
            aria-label="Alert pagination"
          >
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Previous
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                Page {currentPage} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </nav>
        ) : null}
      </section>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle className="sr-only">Alert {selected.id} details</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-8">
                <AlertSummaryHeader
                  alert={selected}
                  {...(selectedRule ? { rule: selectedRule } : {})}
                />
                <AlertActions
                  alert={selected}
                  compact
                  onStatus={(status) => updateStatus(selected, status)}
                />
                <ThresholdMeter
                  alert={selected}
                  {...(selectedRule ? { rule: selectedRule } : {})}
                />
                <EvidenceBreakdown alert={selected} />
                <AffectedPaths paths={selected.affected_paths} />
                <RawJsonPanel alert={selected} />
                <AlertDisclaimer />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate({ to: "/alerts/$id", params: { id: selected.id } })}
                >
                  Open full alert page
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="w-[168px] bg-surface"
        aria-label={`Filter by ${label.toLowerCase()}`}
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="truncate capitalize">{o.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

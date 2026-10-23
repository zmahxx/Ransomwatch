import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Info, Pause, Play, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DemoDataBadge } from "@/components/common/badges";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { formatRelative, formatTimestamp } from "@/lib/format";
import { EVENT_TYPES, eventTypeMeta } from "@/lib/severity";
import { cn } from "@/lib/utils";
import { ransomwatchApi } from "@/services/ransomwatch-api";
import type { EventType } from "@/types/ransomwatch";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity Stream — RansomWatch Security Console" },
      {
        name: "description",
        content:
          "Chronological filesystem event stream with per-event collector, host and path metadata captured by RansomWatch.",
      },
      { property: "og:title", content: "Activity Stream — RansomWatch Security Console" },
      {
        property: "og:description",
        content: "Inspect create, modify, rename and delete events as the collector records them.",
      },
    ],
  }),
  component: ActivityPage,
});

const LIMIT = 40;

function ActivityPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useLocalStorage<{ type: string; directory: string }>(
    "rw.activityFilters",
    { type: "all", directory: "all" },
  );
  const [live, setLive] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: ransomwatchApi.getEvents,
    retry: false,
  });
  const dirsQuery = useQuery({
    queryKey: ["directories"],
    queryFn: ransomwatchApi.getDirectories,
    retry: false,
  });

  useEffect(() => {
    if (!live) return;
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, [live]);

  useEffect(() => {
    if (tick > 0) void eventsQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const events = eventsQuery.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events
      .filter((e) => {
        if (filters.type !== "all" && e.event_type !== filters.type) return false;
        if (filters.directory !== "all" && !(e.path ?? "").startsWith(filters.directory))
          return false;
        if (!term) return true;
        return (
          (e.path ?? "").toLowerCase().includes(term) ||
          (e.destination_path ?? "").toLowerCase().includes(term) ||
          e.collector_name.toLowerCase().includes(term) ||
          e.event_id.toLowerCase().includes(term)
        );
      })
      .slice(0, LIMIT);
  }, [events, filters, search]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <section className="panel p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">Filesystem event stream</h2>
            <p className="truncate text-xs text-muted-foreground">
              Newest first · showing {filtered.length} of {events.length} collected events
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ProcessAttributionHint />
            <DemoDataBadge />
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
                live
                  ? "border-ok/40 bg-ok-soft text-ok"
                  : "border-border bg-secondary text-muted-foreground",
              )}
            >
              <span
                className={cn("size-1.5 rounded-full", live ? "bg-ok" : "bg-muted-foreground")}
              />
              {live ? "Live · 5s" : "Paused"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLive((l) => !l);
                toast(live ? "Auto-refresh paused" : "Auto-refresh enabled", {
                  description: live
                    ? "Stream is frozen."
                    : "Refreshing the demo stream every 5 seconds.",
                });
              }}
              aria-pressed={live}
            >
              {live ? (
                <Pause className="size-4" aria-hidden="true" />
              ) : (
                <Play className="size-4" aria-hidden="true" />
              )}
              {live ? "Pause" : "Go live"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void eventsQuery.refetch()}>
              <RefreshCw
                className={cn("size-4", eventsQuery.isFetching && "animate-spin")}
                aria-hidden="true"
              />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search path, collector or event id…"
              aria-label="Search events"
              className="bg-surface pl-8"
            />
          </div>
          <Select
            value={filters.type}
            onValueChange={(v) => setFilters((f) => ({ ...f, type: v }))}
          >
            <SelectTrigger className="w-[190px] bg-surface" aria-label="Filter by event type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All event types</SelectItem>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.directory}
            onValueChange={(v) => setFilters((f) => ({ ...f, directory: v }))}
          >
            <SelectTrigger className="w-[220px] bg-surface" aria-label="Filter by directory">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All directories</SelectItem>
              {(dirsQuery.data ?? []).map((d) => (
                <SelectItem key={d.id} value={d.path}>
                  {d.path}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="panel overflow-hidden">
        {eventsQuery.isPending ? (
          <LoadingBlock rows={8} />
        ) : eventsQuery.isError ? (
          <ErrorBlock error={eventsQuery.error} onRetry={() => eventsQuery.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyBlock
            title="No events match"
            description="Adjust the event type or directory filter to see more of the stream."
          />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((e) => {
              const meta = eventTypeMeta[e.event_type as EventType];
              const open = expanded === e.event_id;
              return (
                <li key={e.event_id}>
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : e.event_id)}
                    aria-expanded={open}
                    className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/40"
                  >
                    <span
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[11px]"
                      style={{ color: meta.color }}
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      {e.event_type}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-xs text-foreground">
                        {e.path}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {e.collector_name} · {e.platform} · {e.host_id}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <span title={formatTimestamp(e.timestamp)}>
                        {formatRelative(e.timestamp)}
                      </span>
                      <ChevronDown
                        className={cn("size-4 transition-transform", open && "rotate-180")}
                      />
                    </span>
                  </button>
                  {open ? (
                    <dl className="grid gap-x-6 gap-y-2 border-t border-border bg-surface/50 px-4 py-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                      <Detail label="Source path" value={e.path ?? "—"} mono />
                      <Detail label="Destination path" value={e.destination_path ?? "—"} mono />
                      <Detail label="Collector" value={e.collector_name} mono />
                      <Detail label="Platform" value={e.platform} />
                      <Detail label="Host ID" value={e.host_id} mono />
                      <Detail label="Timestamp" value={formatTimestamp(e.timestamp)} mono />
                      <Detail label="Event ID" value={e.event_id} mono />
                      <Detail label="Schema version" value={String(e.schema_version)} />
                      <Detail
                        label="Process"
                        value={
                          e.process_name && e.process_id
                            ? `${e.process_name} · PID ${e.process_id}`
                            : "Not observed"
                        }
                        hint={
                          e.process_name
                            ? "Best-effort attribution from a recently observed open file handle; this is supporting evidence, not proof."
                            : "No matching open file handle was observed during the attribution window."
                        }
                      />
                      <Detail
                        label="Attribution confidence"
                        value={e.metadata["attribution_confidence"] ?? "Unavailable"}
                      />
                      <Detail label="Size (bytes)" value={e.metadata["size_bytes"] ?? "—"} mono />
                    </dl>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProcessAttributionHint() {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Info className="size-3.5" aria-hidden="true" />
            Best-effort attribution
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px]">
          Process identity is shown only when RansomWatch recently observed an open handle for the
          affected path. Unattributed events are expected, and a match is supporting evidence rather
          than proof.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Detail({
  label,
  value,
  mono,
  hint,
}: {
  label: string;
  value: string;
  mono?: boolean;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
        {hint ? (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={hint}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Info className="size-3" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">{hint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </dt>
      <dd className={cn("mt-0.5 break-all text-foreground", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

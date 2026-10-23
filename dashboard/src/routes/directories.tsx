import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FolderPlus, HardDrive, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DemoDataBadge, DirectoryStatusBadge } from "@/components/common/badges";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/common/state-blocks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber, formatRelative, formatTimestamp } from "@/lib/format";
import { ransomwatchApi } from "@/services/ransomwatch-api";

export const Route = createFileRoute("/directories")({
  head: () => ({
    meta: [
      { title: "Monitored Directories — RansomWatch Security Console" },
      {
        name: "description",
        content:
          "Health, file counts and recent event volume for every directory watched by the RansomWatch collector.",
      },
      { property: "og:title", content: "Monitored Directories — RansomWatch Security Console" },
      {
        property: "og:description",
        content: "Review collector coverage, scan freshness and directory status at a glance.",
      },
    ],
  }),
  component: DirectoriesPage,
});

function DirectoriesPage() {
  const dirs = useQuery({
    queryKey: ["directories"],
    queryFn: ransomwatchApi.getDirectories,
    retry: false,
  });
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState("");
  const [recursive, setRecursive] = useState("recursive");

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <section className="panel grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">Collector coverage</h2>
          <p className="text-xs text-muted-foreground">
            Watch paths are configured in the Python detector. This dashboard is read-only.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DemoDataBadge />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <FolderPlus className="size-4" aria-hidden="true" />
                Add directory
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add monitored directory</DialogTitle>
                <DialogDescription>
                  UI prototype only. The browser cannot watch your filesystem — the RansomWatch
                  Python service performs monitoring, and this form will submit to its API once
                  connected.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dir-path">Absolute path</Label>
                  <Input
                    id="dir-path"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="C:\\Users\\demo\\Documents"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dir-mode">Scan mode</Label>
                  <Select value={recursive} onValueChange={setRecursive}>
                    <SelectTrigger id="dir-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recursive">Recursive (include subdirectories)</SelectItem>
                      <SelectItem value="flat">Top level only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="flex items-start gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  Changes made here are local dashboard prototypes until the detector API is
                  connected.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setOpen(false);
                    toast.success("Directory queued (prototype)", {
                      description: `${path || "New path"} would be sent to the detector API.`,
                    });
                    setPath("");
                  }}
                >
                  Add directory
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {dirs.isPending ? (
        <div className="panel">
          <LoadingBlock rows={5} />
        </div>
      ) : dirs.isError ? (
        <div className="panel">
          <ErrorBlock error={dirs.error} onRetry={() => dirs.refetch()} />
        </div>
      ) : (dirs.data ?? []).length === 0 ? (
        <div className="panel">
          <EmptyBlock title="No directories monitored" description="Add a watch path to begin." />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {(dirs.data ?? []).map((d) => (
            <article key={d.id} className="panel p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground">
                    <HardDrive className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="break-all font-mono text-sm text-foreground">{d.path}</h3>
                    <p
                      className="mt-0.5 text-xs text-muted-foreground"
                      title={formatTimestamp(d.last_scan)}
                    >
                      Last scan {formatRelative(d.last_scan)}
                    </p>
                  </div>
                </div>
                <DirectoryStatusBadge status={d.status} />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border bg-surface/60 px-3 py-2">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Files
                  </dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                    {formatNumber(d.file_count)}
                  </dd>
                </div>
                <div className="rounded-md border border-border bg-surface/60 px-3 py-2">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Recent events
                  </dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                    {formatNumber(d.recent_event_count)}
                  </dd>
                </div>
              </dl>

              {d.note ? (
                <p className="mt-3 rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                  {d.note}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

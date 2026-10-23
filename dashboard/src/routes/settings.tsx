import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { DemoDataBadge } from "@/components/common/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  API_BASE_URL,
  USE_MOCK_DATA,
  getSimulateFailures,
  ransomwatchApi,
  setSimulateFailures,
} from "@/services/ransomwatch-api";
import { useRansomwatchStore } from "@/store/ransomwatch-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — RansomWatch Security Console" },
      {
        name: "description",
        content:
          "Dashboard preferences, demo data controls and the API endpoint that will replace the mock service layer.",
      },
      { property: "og:title", content: "Settings — RansomWatch Security Console" },
      {
        property: "og:description",
        content: "Configure the RansomWatch dashboard data source and local prototype state.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { resetLocalChanges } = useRansomwatchStore();
  const [failures, setFailures] = useState(getSimulateFailures());
  const [runningDemo, setRunningDemo] = useState(false);

  return (
    <div className="mx-auto max-w-[900px] space-y-4">
      <section className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Data source</h2>
            <p className="text-xs text-muted-foreground">
              {USE_MOCK_DATA
                ? "The dashboard currently reads from its typed local demo dataset."
                : "The dashboard is connected to the local Python detector API."}
            </p>
          </div>
          <DemoDataBadge />
        </div>
        <Separator className="my-4" />
        <div className="space-y-1.5">
          <Label htmlFor="api-base">Detector API base URL (read-only)</Label>
          <Input id="api-base" value={API_BASE_URL} readOnly className="font-mono" />
          <p className="text-xs text-muted-foreground">
            Set <code className="font-mono">VITE_RANSOMWATCH_DEMO_MODE=true</code> to use the
            bundled mock dataset instead.
          </p>
          {!USE_MOCK_DATA ? (
            <Button
              className="mt-4"
              disabled={runningDemo}
              onClick={async () => {
                setRunningDemo(true);
                try {
                  const result = await ransomwatchApi.runDemo();
                  await queryClient.invalidateQueries();
                  toast.success("Safe rename-burst demo detected", {
                    description: `${result.renamed_files} empty files renamed; ${result.alerts_created} alert created.`,
                  });
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Safe demo failed");
                } finally {
                  setRunningDemo(false);
                }
              }}
            >
              {runningDemo ? "Running safe demo…" : "Run safe detection demo"}
            </Button>
          ) : null}
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="text-sm font-semibold">Diagnostics</h2>
        <Separator className="my-4" />
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <Label htmlFor="simulate-errors" className="text-sm">
              Simulate service outage
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Forces every request to fail so error states can be reviewed.
            </p>
          </div>
          <Switch
            id="simulate-errors"
            checked={failures}
            onCheckedChange={(checked) => {
              setFailures(checked);
              setSimulateFailures(checked);
              void queryClient.invalidateQueries();
              toast(checked ? "Simulating detector outage" : "Detector responses restored");
            }}
          />
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="text-sm font-semibold">Local prototype state</h2>
        <Separator className="my-4" />
        <p className="text-xs text-muted-foreground">
          Alert statuses, rule overrides and filters are stored in this browser's localStorage.
        </p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => {
            resetLocalChanges();
            try {
              window.localStorage.removeItem("rw.alertFilters");
              window.localStorage.removeItem("rw.activityFilters");
            } catch {
              /* storage unavailable */
            }
            toast.success("Local dashboard state cleared");
          }}
        >
          Reset local changes
        </Button>
      </section>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import {
  AffectedPaths,
  AlertDisclaimer,
  AlertSummaryHeader,
  EvidenceBreakdown,
  RawJsonPanel,
  ThresholdMeter,
  WindowTimeline,
} from "@/components/alerts/alert-detail";
import { DemoDataBadge } from "@/components/common/badges";
import { ErrorBlock, LoadingBlock } from "@/components/common/state-blocks";
import { Button } from "@/components/ui/button";
import { ransomwatchApi } from "@/services/ransomwatch-api";
import { useRansomwatchStore } from "@/store/ransomwatch-store";
import type { AlertStatus } from "@/types/ransomwatch";

export const Route = createFileRoute("/alerts/$id")({
  head: () => ({
    meta: [
      { title: "Alert Detail — RansomWatch Security Console" },
      {
        name: "description",
        content:
          "Full detection context for a RansomWatch alert: rule explanation, threshold versus observed events, window timeline, affected paths and raw JSON.",
      },
      { property: "og:title", content: "Alert Detail — RansomWatch Security Console" },
      {
        property: "og:description",
        content: "Explainable detection evidence for a single RansomWatch behavioral alert.",
      },
    ],
  }),
  component: AlertDetailPage,
});

function AlertDetailPage() {
  const { id } = Route.useParams();
  const { applyStatus, setAlertStatus } = useRansomwatchStore();

  const alertQuery = useQuery({
    queryKey: ["alert", id],
    queryFn: () => ransomwatchApi.getAlert(id),
    retry: false,
  });
  const rulesQuery = useQuery({
    queryKey: ["rules"],
    queryFn: ransomwatchApi.getRules,
    retry: false,
  });

  if (alertQuery.isPending) {
    return (
      <div className="panel mx-auto max-w-[1200px]">
        <LoadingBlock rows={8} />
      </div>
    );
  }

  if (alertQuery.isError || !alertQuery.data) {
    return (
      <div className="panel mx-auto max-w-[1200px]">
        <ErrorBlock
          title="Alert unavailable"
          error={alertQuery.error}
          onRetry={() => alertQuery.refetch()}
        />
      </div>
    );
  }

  const alert = applyStatus(alertQuery.data);
  const rule = rulesQuery.data?.find((r) => r.id === alert.rule_id);

  function updateStatus(status: AlertStatus) {
    setAlertStatus(alert.id, status);
    toast.success(`Alert ${alert.id} marked ${status}`, {
      description: "Saved locally in this browser — the detector API is not connected yet.",
    });
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/alerts">
            <ChevronLeft className="size-4" aria-hidden="true" />
            Back to alerts
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <DemoDataBadge />
          <span className="font-mono text-xs text-muted-foreground">{alert.id}</span>
        </div>
      </div>

      <section className="panel space-y-4 p-5">
        <AlertSummaryHeader alert={alert} {...(rule ? { rule } : {})} />
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => updateStatus("acknowledged")}
            disabled={alert.status === "acknowledged"}
          >
            Acknowledge
          </Button>
          <Button
            variant="outline"
            onClick={() => updateStatus("resolved")}
            disabled={alert.status === "resolved"}
          >
            Resolve
          </Button>
          <Button
            variant="outline"
            onClick={() => updateStatus("dismissed")}
            disabled={alert.status === "dismissed"}
          >
            Dismiss
          </Button>
        </div>
        <AlertDisclaimer />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ThresholdMeter alert={alert} {...(rule ? { rule } : {})} />
        <EvidenceBreakdown alert={alert} />
      </div>

      <WindowTimeline alert={alert} />

      <div className="grid gap-4 lg:grid-cols-2">
        <AffectedPaths paths={alert.affected_paths} />
        <RawJsonPanel alert={alert} />
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Info, Settings2, Timer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DemoDataBadge, SeverityBadge } from "@/components/common/badges";
import { ErrorBlock, LoadingBlock } from "@/components/common/state-blocks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { eventTypeMeta } from "@/lib/severity";
import { ransomwatchApi } from "@/services/ransomwatch-api";
import { useRansomwatchStore } from "@/store/ransomwatch-store";
import type { DetectionRule } from "@/types/ransomwatch";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Detection Rules — RansomWatch Security Console" },
      {
        name: "description",
        content:
          "Explainable sliding-window detection rules RW001–RW003: thresholds, windows, cooldowns and enabled state.",
      },
      { property: "og:title", content: "Detection Rules — RansomWatch Security Console" },
      {
        property: "og:description",
        content: "Tune ransomware behavioral rule thresholds and detection windows.",
      },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  const rulesQuery = useQuery({
    queryKey: ["rules"],
    queryFn: ransomwatchApi.getRules,
    retry: false,
  });
  const { applyRule, setRuleOverride } = useRansomwatchStore();
  const [editing, setEditing] = useState<DetectionRule | null>(null);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <section className="panel grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">Sliding-window detection rules</h2>
          <p className="text-xs text-muted-foreground">
            Every rule is explainable: a count of qualifying events inside a fixed window.
          </p>
        </div>
        <DemoDataBadge />
      </section>

      <p className="flex items-start gap-2 rounded-md border border-sev-medium/40 bg-sev-medium-soft px-3 py-2 text-xs text-sev-medium">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Rule edits are local dashboard prototypes stored in this browser. They do not change the
        running Python detector until the API is connected.
      </p>

      {rulesQuery.isPending ? (
        <div className="panel">
          <LoadingBlock rows={5} />
        </div>
      ) : rulesQuery.isError ? (
        <div className="panel">
          <ErrorBlock error={rulesQuery.error} onRetry={() => rulesQuery.refetch()} />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {(rulesQuery.data ?? []).map((base) => {
            const rule = applyRule(base);
            return (
              <article key={rule.id} className="panel flex flex-col p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-border bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
                        {rule.id}
                      </span>
                      <SeverityBadge severity={rule.severity} />
                    </div>
                    <h3 className="mt-2 text-sm font-semibold">{rule.name}</h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Label htmlFor={`toggle-${rule.id}`} className="text-xs text-muted-foreground">
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </Label>
                    <Switch
                      id={`toggle-${rule.id}`}
                      checked={rule.enabled}
                      onCheckedChange={(checked) => {
                        setRuleOverride(rule.id, { enabled: checked });
                        toast.success(
                          `${rule.id} ${checked ? "enabled" : "disabled"} (local prototype)`,
                        );
                      }}
                    />
                  </div>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">{rule.description}</p>

                <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <Field label="Threshold" value={`${rule.threshold} events`} />
                  <Field label="Detection window" value={`${rule.window_seconds}s`} />
                  <Field label="Cooldown" value={`${rule.cooldown_seconds}s`} />
                  <Field
                    label="Event types"
                    value={rule.event_types.map((t) => eventTypeMeta[t].label).join(", ")}
                  />
                </dl>

                <p className="mt-3 flex items-start gap-2 rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                  <Timer className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  Default: {base.threshold_label}
                </p>

                <Button variant="outline" className="mt-4 w-full" onClick={() => setEditing(rule)}>
                  <Settings2 className="size-4" aria-hidden="true" />
                  Edit configuration
                </Button>
              </article>
            );
          })}
        </div>
      )}

      <RuleDialog
        rule={editing}
        onClose={() => setEditing(null)}
        onSave={(values) => {
          if (!editing) return;
          setRuleOverride(editing.id, values);
          setEditing(null);
          toast.success(`${editing.id} configuration updated`, {
            description:
              "Local dashboard prototype — the detector still runs its own configuration.",
          });
        }}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface/60 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function RuleDialog({
  rule,
  onClose,
  onSave,
}: {
  rule: DetectionRule | null;
  onClose: () => void;
  onSave: (values: { threshold: number; window_seconds: number; cooldown_seconds: number }) => void;
}) {
  const [threshold, setThreshold] = useState("");
  const [windowSeconds, setWindowSeconds] = useState("");
  const [cooldown, setCooldown] = useState("");

  return (
    <Dialog
      open={!!rule}
      onOpenChange={(open) => {
        if (!open) onClose();
        if (open && rule) {
          setThreshold(String(rule.threshold));
          setWindowSeconds(String(rule.window_seconds));
          setCooldown(String(rule.cooldown_seconds));
        }
      }}
    >
      <DialogContent
        onOpenAutoFocus={() => {
          if (rule) {
            setThreshold(String(rule.threshold));
            setWindowSeconds(String(rule.window_seconds));
            setCooldown(String(rule.cooldown_seconds));
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Configure {rule?.id}</DialogTitle>
          <DialogDescription>
            {rule?.name} — changes are stored locally in this browser as a prototype until the
            detector API is connected.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rule-threshold">Threshold (events)</Label>
            <Input
              id="rule-threshold"
              type="number"
              min={1}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rule-window">Detection window (seconds)</Label>
            <Input
              id="rule-window"
              type="number"
              min={1}
              value={windowSeconds}
              onChange={(e) => setWindowSeconds(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rule-cooldown">Cooldown (seconds)</Label>
            <Input
              id="rule-cooldown"
              type="number"
              min={0}
              value={cooldown}
              onChange={(e) => setCooldown(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                threshold: Math.max(1, Number(threshold) || 1),
                window_seconds: Math.max(1, Number(windowSeconds) || 1),
                cooldown_seconds: Math.max(0, Number(cooldown) || 0),
              })
            }
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

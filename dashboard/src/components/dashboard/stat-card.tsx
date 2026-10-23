import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type StatTone = "neutral" | "primary" | "warning" | "critical";

const toneMap: Record<StatTone, { ring: string; icon: string; value: string }> = {
  neutral: { ring: "ring-border", icon: "bg-secondary text-foreground", value: "text-foreground" },
  primary: {
    ring: "ring-primary/30",
    icon: "bg-primary/15 text-primary",
    value: "text-foreground",
  },
  warning: {
    ring: "ring-sev-medium/30",
    icon: "bg-sev-medium-soft text-sev-medium",
    value: "text-sev-medium",
  },
  critical: {
    ring: "ring-sev-critical/40",
    icon: "bg-sev-critical-soft text-sev-critical",
    value: "text-sev-critical",
  },
};

export interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: StatTone;
  trend?: { value: string; direction: "up" | "down" | "flat"; good?: boolean };
  hint?: string;
  footnote?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  trend,
  hint,
  footnote,
}: StatCardProps) {
  const t = toneMap[tone];
  const TrendIcon =
    trend?.direction === "up"
      ? ArrowUpRight
      : trend?.direction === "down"
        ? ArrowDownRight
        : ArrowRight;

  const content = (
    <article className={cn("panel p-4 ring-1 ring-inset", t.ring)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </h3>
          <p className={cn("mt-2 text-2xl font-semibold tabular-nums tracking-tight", t.value)}>
            {value}
          </p>
        </div>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-md", t.icon)}>
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-medium",
              trend.good === false
                ? "text-sev-high"
                : trend.good
                  ? "text-ok"
                  : "text-muted-foreground",
            )}
          >
            <TrendIcon className="size-3" aria-hidden="true" />
            {trend.value}
          </span>
        ) : null}
        {footnote ? <span className="truncate text-muted-foreground">{footnote}</span> : null}
      </div>
    </article>
  );

  if (!hint) return content;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div tabIndex={0} className="rounded-lg outline-none">
          {content}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{hint}</TooltipContent>
    </Tooltip>
  );
}

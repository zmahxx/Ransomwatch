import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { eventTypeMeta, EVENT_TYPES } from "@/lib/severity";
import type { ActivityPoint } from "@/types/ransomwatch";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-panel">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="size-2 rounded-[2px]"
                style={{ backgroundColor: p.color }}
                aria-hidden="true"
              />
              {eventTypeMeta[p.dataKey as keyof typeof eventTypeMeta]?.label ?? String(p.dataKey)}
            </span>
            <span className="font-medium tabular-nums text-foreground">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  const spike = data.find((d) => d.alert_id);
  const spikeIndex = spike ? data.indexOf(spike) : -1;

  return (
    <div className="h-[288px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 12, left: -18, bottom: 0 }}>
          <defs>
            {EVENT_TYPES.map((t) => (
              <linearGradient key={t} id={`grad-${t}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={eventTypeMeta[t].color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={eventTypeMeta[t].color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={16}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <RTooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-muted-foreground">
                {eventTypeMeta[value as keyof typeof eventTypeMeta]?.label ?? value}
              </span>
            )}
          />
          {EVENT_TYPES.map((t) => (
            <Area
              key={t}
              type="monotone"
              dataKey={t}
              stroke={eventTypeMeta[t].color}
              fill={`url(#grad-${t})`}
              strokeWidth={t === "file_moved" ? 2.2 : 1.6}
              activeDot={{ r: 3 }}
            />
          ))}
          {spike && spikeIndex >= 0 ? (
            <ReferenceDot
              x={spike.label}
              y={spike.file_moved}
              r={6}
              fill="var(--sev-critical)"
              stroke="var(--background)"
              strokeWidth={2}
              isFront
              label={{
                value: "Critical: rename burst",
                position: "top",
                fill: "var(--sev-critical)",
                fontSize: 11,
              }}
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

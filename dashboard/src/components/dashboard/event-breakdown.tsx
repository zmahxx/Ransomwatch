import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import { eventTypeMeta, EVENT_TYPES } from "@/lib/severity";
import { formatNumber } from "@/lib/format";
import type { ActivityPoint } from "@/types/ransomwatch";

export function EventBreakdown({ data }: { data: ActivityPoint[] }) {
  const totals = EVENT_TYPES.map((type) => ({
    type,
    label: eventTypeMeta[type].label,
    color: eventTypeMeta[type].color,
    value: data.reduce((sum, point) => sum + point[type], 0),
  }));
  const total = totals.reduce((sum, t) => sum + t.value, 0);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative h-[176px] w-full shrink-0 sm:w-[152px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <RTooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [formatNumber(value), name]}
            />
            <Pie
              data={totals}
              dataKey="value"
              nameKey="label"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {totals.map((t) => (
                <Cell key={t.type} fill={t.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-lg font-semibold tabular-nums">{formatNumber(total)}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">events</p>
          </div>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {totals.map((t) => (
          <li key={t.type} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: t.color }}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap text-muted-foreground">{t.label}</span>
            </span>
            <span className="shrink-0 tabular-nums font-medium">
              {formatNumber(t.value)}
              <span className="ml-2 text-xs text-muted-foreground">
                {total ? Math.round((t.value / total) * 100) : 0}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

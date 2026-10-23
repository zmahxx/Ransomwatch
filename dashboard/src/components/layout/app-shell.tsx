import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  ChevronLeft,
  FolderTree,
  LayoutDashboard,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DemoDataBadge } from "@/components/common/badges";
import { useTimeRange } from "@/components/layout/time-range";
import { cn } from "@/lib/utils";
import type { TimeRange } from "@/types/ransomwatch";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/alerts", label: "Alerts", icon: ShieldAlert, exact: false },
  { to: "/activity", label: "Activity", icon: Activity, exact: false },
  { to: "/directories", label: "Monitored Directories", icon: FolderTree, exact: false },
  { to: "/rules", label: "Detection Rules", icon: SlidersHorizontal, exact: false },
  { to: "/settings", label: "Settings", icon: Settings, exact: false },
] as const;

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/alerts": "Alerts",
  "/activity": "Activity",
  "/directories": "Monitored Directories",
  "/rules": "Detection Rules",
  "/settings": "Settings",
};

const RANGES: TimeRange[] = ["1H", "6H", "24H", "7D"];

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { range, setRange } = useTimeRange();
  const [query, setQuery] = useState("");

  const title = pathname.startsWith("/alerts/")
    ? "Alert Detail"
    : (TITLES[pathname.replace(/\/$/, "") || "/"] ?? "RansomWatch");

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
          collapsed ? "w-[68px]" : "w-64",
        )}
        aria-label="Primary"
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                RansomWatch
              </p>
              <p className="truncate text-[11px] text-muted-foreground">Behavioral FS Monitor</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.to
              : pathname === item.to || pathname.startsWith(`${item.to}/`);
            const link = (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  active &&
                    "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--sidebar-primary)]",
                  collapsed && "justify-center px-0",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {collapsed ? (
                  <span className="sr-only">{item.label}</span>
                ) : (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              link
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div
            className={cn(
              "flex items-center gap-2 rounded-md bg-ok-soft px-2.5 py-2",
              collapsed && "justify-center px-0",
            )}
          >
            <span className="relative flex size-2 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-ok" />
            </span>
            {!collapsed && (
              <span className="truncate text-xs font-semibold text-ok">Monitoring Active</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-center text-muted-foreground"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
            {!collapsed && <span>Collapse</span>}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground lg:text-lg">
                {title}
              </h1>
              <DemoDataBadge className="hidden sm:inline-flex" />
            </div>

            <div className="flex items-center gap-2">
              <form
                role="search"
                className="relative hidden lg:block"
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate({ to: "/alerts", search: query ? { q: query } : {} });
                }}
              >
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search alerts, paths, rules…"
                  aria-label="Global search"
                  className="w-64 bg-surface pl-8"
                />
              </form>

              <Select value={range} onValueChange={(v) => setRange(v as TimeRange)}>
                <SelectTrigger className="w-[104px] bg-surface" aria-label="Global time range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANGES.map((r) => (
                    <SelectItem key={r} value={r}>
                      Last {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="relative bg-surface"
                    aria-label="Notifications: 1 unread critical alert"
                    onClick={() => navigate({ to: "/alerts/$id", params: { id: "alert-001" } })}
                  >
                    <Bell className="size-4" aria-hidden="true" />
                    <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-sev-critical text-[10px] font-bold text-background">
                      1
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>1 unread critical alert</TooltipContent>
              </Tooltip>

              <button
                type="button"
                className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-left transition-colors hover:bg-accent"
                aria-label="Signed in as Z. Mullinax, Security Analyst"
              >
                <span className="grid size-6 place-items-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                  ZM
                </span>
                <span className="hidden text-xs leading-tight xl:block">
                  <span className="block font-medium text-foreground">Z. Mullinax</span>
                  <span className="block text-muted-foreground">Analyst</span>
                </span>
              </button>
            </div>
          </div>

          <nav
            className="flex gap-1 overflow-x-auto border-t border-border px-3 py-1.5 md:hidden"
            aria-label="Primary mobile"
          >
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                activeProps={{ className: "bg-accent text-foreground" }}
                activeOptions={{ exact: item.exact }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main id="main-content" className="min-w-0 flex-1 px-4 py-5 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

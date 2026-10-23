import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { TimeRange } from "@/types/ransomwatch";

interface Value {
  range: TimeRange;
  setRange: (range: TimeRange) => void;
}

const TimeRangeContext = createContext<Value | null>(null);

export function TimeRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useLocalStorage<TimeRange>("rw.timeRange", "24H");
  const value = useMemo(
    () => ({ range, setRange: (r: TimeRange) => setRange(r) }),
    [range, setRange],
  );
  return <TimeRangeContext.Provider value={value}>{children}</TimeRangeContext.Provider>;
}

export function useTimeRange() {
  const ctx = useContext(TimeRangeContext);
  if (!ctx) throw new Error("useTimeRange must be used inside TimeRangeProvider");
  return ctx;
}

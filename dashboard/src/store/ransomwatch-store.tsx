import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { AlertStatus, DetectionAlert, DetectionRule, RuleId } from "@/types/ransomwatch";

export interface RuleOverride {
  enabled?: boolean;
  threshold?: number;
  window_seconds?: number;
  cooldown_seconds?: number;
}

interface StoreValue {
  statusOverrides: Record<string, AlertStatus>;
  setAlertStatus: (id: string, status: AlertStatus) => void;
  applyStatus: (alert: DetectionAlert) => DetectionAlert;
  applyStatuses: (alerts: DetectionAlert[]) => DetectionAlert[];
  ruleOverrides: Record<string, RuleOverride>;
  setRuleOverride: (id: RuleId, override: RuleOverride) => void;
  applyRule: (rule: DetectionRule) => DetectionRule;
  resetLocalChanges: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function RansomwatchStoreProvider({ children }: { children: ReactNode }) {
  const [statusOverrides, setStatusOverrides] = useLocalStorage<Record<string, AlertStatus>>(
    "rw.alertStatuses",
    {},
  );
  const [ruleOverrides, setRuleOverrides] = useLocalStorage<Record<string, RuleOverride>>(
    "rw.ruleOverrides",
    {},
  );

  const setAlertStatus = useCallback(
    (id: string, status: AlertStatus) => setStatusOverrides((prev) => ({ ...prev, [id]: status })),
    [setStatusOverrides],
  );

  const setRuleOverride = useCallback(
    (id: RuleId, override: RuleOverride) =>
      setRuleOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...override } })),
    [setRuleOverrides],
  );

  const applyStatus = useCallback(
    (alert: DetectionAlert): DetectionAlert => {
      const override = statusOverrides[alert.id];
      return override ? { ...alert, status: override } : alert;
    },
    [statusOverrides],
  );

  const applyStatuses = useCallback(
    (alerts: DetectionAlert[]) => alerts.map(applyStatus),
    [applyStatus],
  );

  const applyRule = useCallback(
    (rule: DetectionRule): DetectionRule => ({ ...rule, ...(ruleOverrides[rule.id] ?? {}) }),
    [ruleOverrides],
  );

  const resetLocalChanges = useCallback(() => {
    setStatusOverrides({});
    setRuleOverrides({});
  }, [setStatusOverrides, setRuleOverrides]);

  const value = useMemo(
    () => ({
      statusOverrides,
      setAlertStatus,
      applyStatus,
      applyStatuses,
      ruleOverrides,
      setRuleOverride,
      applyRule,
      resetLocalChanges,
    }),
    [
      statusOverrides,
      setAlertStatus,
      applyStatus,
      applyStatuses,
      ruleOverrides,
      setRuleOverride,
      applyRule,
      resetLocalChanges,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useRansomwatchStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useRansomwatchStore must be used inside RansomwatchStoreProvider");
  return ctx;
}

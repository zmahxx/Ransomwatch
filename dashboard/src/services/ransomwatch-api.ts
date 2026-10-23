/** Typed transport boundary between the dashboard and Python detector. */
import {
  buildActivitySeries,
  mockAlerts,
  mockDirectories,
  mockEvents,
  mockMetrics,
  mockRules,
} from "@/data/mock";
import type {
  ActivityPoint,
  DetectionAlert,
  DetectionRule,
  MonitoredDirectory,
  OverviewMetrics,
  SecurityEvent,
  TimeRange,
} from "@/types/ransomwatch";

export const API_BASE_URL = (
  import.meta.env.VITE_RANSOMWATCH_API_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");
export const USE_MOCK_DATA = import.meta.env.VITE_RANSOMWATCH_DEMO_MODE === "true";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const LATENCY_MS = 320;
let simulateFailures = false;

export function setSimulateFailures(value: boolean) {
  simulateFailures = value;
}

export function getSimulateFailures() {
  return simulateFailures;
}

function respond<T>(value: T, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (simulateFailures) {
        reject(new ApiError(`Detector service unreachable while loading ${label}.`, 503));
        return;
      }
      resolve(value);
    }, LATENCY_MS);
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (simulateFailures) {
    throw new ApiError("Detector service unreachable while diagnostics are enabled.", 503);
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(
      `Cannot reach the detector at ${API_BASE_URL}. Start it with ransomwatch serve.`,
      503,
    );
  }
  if (!response.ok) {
    let detail = `Detector request failed with HTTP ${response.status}.`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // Preserve the status-based fallback when the response is not JSON.
    }
    throw new ApiError(detail, response.status);
  }
  return (await response.json()) as T;
}

export interface AlertQuery {
  search?: string;
  severities?: string[];
  statuses?: string[];
  ruleIds?: string[];
  directory?: string;
  range?: TimeRange | "ALL";
}

export const rangeToMs: Record<TimeRange, number> = {
  "1H": 60 * 60 * 1000,
  "6H": 6 * 60 * 60 * 1000,
  "24H": 24 * 60 * 60 * 1000,
  "7D": 7 * 24 * 60 * 60 * 1000,
};

export const ransomwatchApi = {
  getOverviewMetrics(): Promise<OverviewMetrics> {
    return USE_MOCK_DATA
      ? respond(mockMetrics, "overview metrics")
      : request<OverviewMetrics>("/overview");
  },

  getActivitySeries(range: TimeRange): Promise<ActivityPoint[]> {
    return USE_MOCK_DATA
      ? respond(buildActivitySeries(range), "filesystem activity")
      : request<ActivityPoint[]>(`/activity?range=${range}`);
  },

  getAlerts(): Promise<DetectionAlert[]> {
    return USE_MOCK_DATA ? respond(mockAlerts, "alerts") : request<DetectionAlert[]>("/alerts");
  },

  getAlert(id: string): Promise<DetectionAlert> {
    if (!USE_MOCK_DATA) return request<DetectionAlert>(`/alerts/${encodeURIComponent(id)}`);
    const alert = mockAlerts.find((candidate) => candidate.id === id);
    if (!alert) return Promise.reject(new ApiError(`Alert ${id} was not found.`, 404));
    return respond(alert, `alert ${id}`);
  },

  getEvents(): Promise<SecurityEvent[]> {
    return USE_MOCK_DATA
      ? respond(mockEvents, "filesystem events")
      : request<SecurityEvent[]>("/events");
  },

  getDirectories(): Promise<MonitoredDirectory[]> {
    return USE_MOCK_DATA
      ? respond(mockDirectories, "monitored directories")
      : request<MonitoredDirectory[]>("/directories");
  },

  getRules(): Promise<DetectionRule[]> {
    return USE_MOCK_DATA
      ? respond(mockRules, "detection rules")
      : request<DetectionRule[]>("/rules");
  },

  runDemo(): Promise<{ renamed_files: number; alerts_created: number }> {
    if (USE_MOCK_DATA) {
      return respond({ renamed_files: 12, alerts_created: 1 }, "safe demo");
    }
    return request("/demo", { method: "POST" });
  },
};

export type RansomwatchApi = typeof ransomwatchApi;

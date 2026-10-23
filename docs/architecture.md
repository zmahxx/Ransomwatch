# Architecture

RansomWatch is a modular monolith. Domain models and detection rules stay independent
of frameworks and operating-system collectors. Adapters normalize external activity
into immutable events.

The MVP pipeline is:

1. `PollingFileCollector` snapshots file metadata under one explicit directory.
2. Snapshot differences become platform-neutral `SecurityEvent` objects.
3. `DetectionEngine` maintains a bounded time window and evaluates three rules.
4. Matching rules produce JSON-serializable `DetectionAlert` objects with evidence.
5. `MonitoringService` keeps bounded in-memory histories backed by SQLite persistence.
6. The loopback-only FastAPI adapter exposes typed `/api/v1` dashboard contracts.
7. The React dashboard consumes the API through one TypeScript service boundary.

## Rules

| Rule | Signal | Default threshold | Severity |
| --- | --- | ---: | --- |
| RW001 | modified, moved, or deleted files | 20 / 10 seconds | high |
| RW002 | moved files | 8 / 10 seconds | critical |
| RW003 | deleted files | 10 / 10 seconds | high |

Alerts use a cooldown to avoid emitting one alert for every subsequent event. All
thresholds can be changed with `RANSOMWATCH_` environment variables.

## Trust boundaries

The collector uses only path, size, and modification-time metadata. It does not read
file contents, identify a process, stop a process, or modify monitored data. Rename
pairing is an explainable metadata heuristic, so alerts indicate suspicious behavior
rather than proving ransomware attribution.

The HTTP service binds to `127.0.0.1` by default. CORS is restricted to common local
Vite development origins. Alert workflow changes and rule edits remain browser-local
prototype state; the Python API currently provides read access plus an explicitly
requested, marker-protected safe demo.

An optional `OpenFileProcessAttributor` samples accessible process handles and caches
short-lived path-to-process observations. Matching events record the process name and
PID with `attribution_method=open_files_snapshot` and
`attribution_confidence=best_effort`. This correlation is intentionally presented as
supporting evidence, never as proof that the process caused the filesystem operation.

"""In-memory monitoring service used by the CLI and local dashboard API."""

from collections import deque
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path
from threading import RLock
from uuid import uuid4

from ransomwatch.domain.alerts import StoredAlert
from ransomwatch.domain.detection import DetectionEngine, DetectionPolicy
from ransomwatch.domain.events import EventType, SecurityEvent
from ransomwatch.infrastructure.filesystem import PollingFileCollector
from ransomwatch.infrastructure.processes import OpenFileProcessAttributor
from ransomwatch.infrastructure.sqlite import SQLiteRepository
from ransomwatch.simulator import prepare_sandbox, simulate_rename_burst


class MonitoringService:
    """Own the collector, detector, and bounded live dashboard history."""

    def __init__(
        self,
        root: Path,
        policy: DetectionPolicy | None = None,
        *,
        event_limit: int = 5_000,
        alert_limit: int = 500,
        repository: SQLiteRepository | None = None,
        attributor: OpenFileProcessAttributor | None = None,
    ) -> None:
        self.root = root.resolve()
        self.collector = PollingFileCollector(self.root)
        self.engine = DetectionEngine(policy)
        self.repository = repository
        self.attributor = attributor
        persisted_events = repository.load_events(event_limit) if repository else []
        persisted_alerts = repository.load_alerts(alert_limit) if repository else []
        self.events: deque[SecurityEvent] = deque(persisted_events, maxlen=event_limit)
        self.alerts: deque[StoredAlert] = deque(persisted_alerts, maxlen=alert_limit)
        self.last_scan = datetime.now(UTC)
        self.status = "active"
        self.error: str | None = None
        self._lock = RLock()
        self.collector.prime()

    @property
    def file_count(self) -> int:
        """Return the size of the most recent metadata snapshot."""
        return self.collector.file_count

    def scan(self) -> tuple[SecurityEvent, ...]:
        """Collect one snapshot delta and process it through every rule."""
        with self._lock:
            try:
                if self.attributor is not None:
                    self.attributor.sample()
                collected = self.collector.collect()
            except (OSError, ValueError) as error:
                self.status = "error"
                self.error = str(error)
                self.last_scan = datetime.now(UTC)
                return ()

            self.status = "active"
            self.error = None
            self.last_scan = datetime.now(UTC)
            for event in collected:
                identity = (
                    self.attributor.resolve(event.path, event.destination_path)
                    if self.attributor is not None
                    else None
                )
                if identity is not None:
                    event = replace(
                        event,
                        process_id=identity.process_id,
                        process_name=identity.process_name,
                        metadata={
                            **event.metadata,
                            "attribution_method": "open_files_snapshot",
                            "attribution_confidence": "best_effort",
                        },
                    )
                self.events.append(event)
                if self.repository is not None:
                    self.repository.save_event(event)
                for alert in self.engine.process(event):
                    stored = StoredAlert(id=f"alert-{uuid4()}", alert=alert)
                    self.alerts.appendleft(stored)
                    if self.repository is not None:
                        self.repository.save_alert(stored)
            return collected

    def run_safe_demo(self, file_count: int = 12) -> tuple[int, int]:
        """Generate and immediately detect a marker-protected rename burst."""
        with self._lock:
            marker = self.root / ".ransomwatch-sandbox"
            if not marker.is_file():
                raise ValueError(
                    "safe demo requires a directory prepared by `ransomwatch demo`"
                )
            prepare_sandbox(self.root, file_count)
            self.collector.prime()
            renamed = simulate_rename_burst(self.root)
            before = len(self.alerts)
            self.scan()
            return len(renamed), len(self.alerts) - before

    def recent_events(self, *, within: timedelta | None = None) -> list[SecurityEvent]:
        """Return newest-first events, optionally restricted by age."""
        self.scan()
        events = list(reversed(self.events))
        if within is None:
            return events
        cutoff = datetime.now(UTC) - within
        return [event for event in events if event.timestamp >= cutoff]

    def recent_alerts(self) -> list[StoredAlert]:
        """Return newest-first stored alerts after collecting current changes."""
        self.scan()
        return list(self.alerts)

    def event_counts(self, *, within: timedelta) -> dict[EventType, int]:
        """Count recent events by type."""
        counts = dict.fromkeys(EventType, 0)
        for event in self.recent_events(within=within):
            counts[event.event_type] += 1
        return counts

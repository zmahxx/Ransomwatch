"""Stateful, content-agnostic ransomware behavior detection rules."""

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

from ransomwatch.domain.alerts import DetectionAlert, Severity
from ransomwatch.domain.events import EventType, SecurityEvent

FILE_ACTIVITY = {
    EventType.FILE_CREATED,
    EventType.FILE_MODIFIED,
    EventType.FILE_MOVED,
    EventType.FILE_DELETED,
}
MUTATION_ACTIVITY = {
    EventType.FILE_MODIFIED,
    EventType.FILE_MOVED,
    EventType.FILE_DELETED,
}


@dataclass(frozen=True, slots=True)
class DetectionPolicy:
    """Thresholds for a compact, explainable sliding-window detector."""

    window_seconds: float = 10.0
    mutation_threshold: int = 20
    rename_threshold: int = 8
    delete_threshold: int = 10
    alert_cooldown_seconds: float = 10.0
    evidence_path_limit: int = 8


class DetectionEngine:
    """Correlate filesystem events and emit rate-based behavior alerts."""

    def __init__(self, policy: DetectionPolicy | None = None) -> None:
        self.policy = policy or DetectionPolicy()
        self._events: deque[SecurityEvent] = deque()
        self._last_alert_at: dict[str, datetime] = {}

    def process(self, event: SecurityEvent) -> tuple[DetectionAlert, ...]:
        """Add one event and return any newly triggered alerts."""
        if event.event_type not in FILE_ACTIVITY:
            return ()

        self._events.append(event)
        cutoff = event.timestamp - timedelta(seconds=self.policy.window_seconds)
        while self._events and self._events[0].timestamp < cutoff:
            self._events.popleft()

        alerts: list[DetectionAlert] = []
        mutations = self._matching(MUTATION_ACTIVITY)
        moves = self._matching({EventType.FILE_MOVED})
        deletes = self._matching({EventType.FILE_DELETED})

        if len(mutations) >= self.policy.mutation_threshold:
            alert = self._make_alert(
                event,
                "RW001",
                "High-rate file mutation",
                Severity.HIGH,
                mutations,
                "Many files were modified, renamed, or deleted in a short window.",
            )
            if alert:
                alerts.append(alert)
        if len(moves) >= self.policy.rename_threshold:
            alert = self._make_alert(
                event,
                "RW002",
                "Rapid file rename burst",
                Severity.CRITICAL,
                moves,
                (
                    "Many files were renamed in a short window, "
                    "a common encryption pattern."
                ),
            )
            if alert:
                alerts.append(alert)
        if len(deletes) >= self.policy.delete_threshold:
            alert = self._make_alert(
                event,
                "RW003",
                "Rapid file deletion burst",
                Severity.HIGH,
                deletes,
                "Many files disappeared in a short window.",
            )
            if alert:
                alerts.append(alert)
        return tuple(alerts)

    def _matching(self, event_types: set[EventType]) -> list[SecurityEvent]:
        return [event for event in self._events if event.event_type in event_types]

    def _make_alert(
        self,
        current: SecurityEvent,
        rule_id: str,
        title: str,
        severity: Severity,
        matches: list[SecurityEvent],
        description: str,
    ) -> DetectionAlert | None:
        last_alert = self._last_alert_at.get(rule_id)
        if last_alert is not None:
            elapsed = (current.timestamp - last_alert).total_seconds()
            if elapsed < self.policy.alert_cooldown_seconds:
                return None
        self._last_alert_at[rule_id] = current.timestamp

        paths: list[Path] = []
        for match in reversed(matches):
            candidate = match.destination_path or match.path
            if candidate is not None and candidate not in paths:
                paths.append(candidate)
            if len(paths) == self.policy.evidence_path_limit:
                break

        counts = {
            event_type.value: sum(match.event_type == event_type for match in matches)
            for event_type in FILE_ACTIVITY
        }
        return DetectionAlert(
            rule_id=rule_id,
            title=title,
            severity=severity,
            timestamp=current.timestamp,
            description=description,
            event_count=len(matches),
            window_seconds=self.policy.window_seconds,
            affected_paths=tuple(paths),
            evidence={key: value for key, value in counts.items() if value},
        )

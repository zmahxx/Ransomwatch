"""SQLite persistence for normalized events and explainable alerts."""

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from threading import RLock
from uuid import UUID

from ransomwatch.domain.alerts import DetectionAlert, Severity, StoredAlert
from ransomwatch.domain.events import EventType, SecurityEvent


class SQLiteRepository:
    """Persist bounded dashboard history in a local SQLite database."""

    def __init__(self, path: Path) -> None:
        self.path = path.resolve()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = RLock()
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=5)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._lock, self._connect() as connection:
            connection.executescript(
                """
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS events (
                    event_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    source TEXT NOT NULL,
                    platform TEXT NOT NULL,
                    host_id TEXT NOT NULL,
                    collector_name TEXT NOT NULL,
                    path TEXT,
                    destination_path TEXT,
                    process_id INTEGER,
                    process_name TEXT,
                    metadata_json TEXT NOT NULL,
                    schema_version INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS events_timestamp_idx
                    ON events(timestamp DESC);
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    rule_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    status TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    description TEXT NOT NULL,
                    event_count INTEGER NOT NULL,
                    window_seconds REAL NOT NULL,
                    affected_paths_json TEXT NOT NULL,
                    evidence_json TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS alerts_timestamp_idx
                    ON alerts(timestamp DESC);
                """
            )

    def save_event(self, event: SecurityEvent) -> None:
        """Insert an event once by immutable event identifier."""
        with self._lock, self._connect() as connection:
            connection.execute(
                """
                INSERT OR IGNORE INTO events
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(event.event_id),
                    event.event_type.value,
                    event.timestamp.isoformat(),
                    event.source,
                    event.platform,
                    event.host_id,
                    event.collector_name,
                    str(event.path) if event.path else None,
                    str(event.destination_path) if event.destination_path else None,
                    event.process_id,
                    event.process_name,
                    json.dumps(dict(event.metadata), sort_keys=True),
                    event.schema_version,
                ),
            )

    def save_alert(self, stored: StoredAlert) -> None:
        """Insert an alert once by dashboard identifier."""
        alert = stored.alert
        with self._lock, self._connect() as connection:
            connection.execute(
                """
                INSERT OR IGNORE INTO alerts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    stored.id,
                    alert.rule_id,
                    alert.title,
                    alert.severity.value,
                    stored.status,
                    alert.timestamp.isoformat(),
                    alert.description,
                    alert.event_count,
                    alert.window_seconds,
                    json.dumps([str(path) for path in alert.affected_paths]),
                    json.dumps(dict(alert.evidence), sort_keys=True),
                ),
            )

    def load_events(self, limit: int = 5_000) -> list[SecurityEvent]:
        """Load oldest-first events so bounded deques preserve chronology."""
        with self._lock, self._connect() as connection:
            rows = connection.execute(
                "SELECT * FROM events ORDER BY timestamp DESC LIMIT ?", (limit,)
            ).fetchall()
        return [self._event_from_row(row) for row in reversed(rows)]

    def load_alerts(self, limit: int = 500) -> list[StoredAlert]:
        """Load newest-first alerts for direct dashboard display."""
        with self._lock, self._connect() as connection:
            rows = connection.execute(
                "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?", (limit,)
            ).fetchall()
        return [self._alert_from_row(row) for row in rows]

    @staticmethod
    def _event_from_row(row: sqlite3.Row) -> SecurityEvent:
        return SecurityEvent(
            event_type=EventType(row["event_type"]),
            timestamp=datetime.fromisoformat(row["timestamp"]),
            source=row["source"],
            platform=row["platform"],
            host_id=row["host_id"],
            collector_name=row["collector_name"],
            path=Path(row["path"]) if row["path"] else None,
            destination_path=(
                Path(row["destination_path"]) if row["destination_path"] else None
            ),
            process_id=row["process_id"],
            process_name=row["process_name"],
            metadata=json.loads(row["metadata_json"]),
            event_id=UUID(row["event_id"]),
            schema_version=row["schema_version"],
        )

    @staticmethod
    def _alert_from_row(row: sqlite3.Row) -> StoredAlert:
        alert = DetectionAlert(
            rule_id=row["rule_id"],
            title=row["title"],
            severity=Severity(row["severity"]),
            timestamp=datetime.fromisoformat(row["timestamp"]),
            description=row["description"],
            event_count=row["event_count"],
            window_seconds=row["window_seconds"],
            affected_paths=tuple(
                Path(path) for path in json.loads(row["affected_paths_json"])
            ),
            evidence=json.loads(row["evidence_json"]),
        )
        return StoredAlert(id=row["id"], alert=alert, status=row["status"])

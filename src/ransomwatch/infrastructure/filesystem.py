"""Portable metadata-only polling collector for a designated directory."""

import platform
import socket
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from ransomwatch.domain.events import EventType, SecurityEvent


@dataclass(frozen=True, slots=True)
class FileState:
    """Metadata used to identify changes without reading file contents."""

    size: int
    modified_ns: int


class PollingFileCollector:
    """Compare directory snapshots and emit normalized filesystem events."""

    def __init__(
        self,
        root: Path,
        *,
        now: Callable[[], datetime] | None = None,
        host_id: str | None = None,
    ) -> None:
        self.root = root.resolve()
        self._now = now or (lambda: datetime.now(UTC))
        self._host_id = host_id or socket.gethostname()
        self._previous: dict[Path, FileState] = {}

    def prime(self) -> int:
        """Record the baseline without treating existing files as new."""
        self._previous = self._snapshot()
        return len(self._previous)

    @property
    def file_count(self) -> int:
        """Return the number of files in the latest completed snapshot."""
        return len(self._previous)

    def collect(self) -> tuple[SecurityEvent, ...]:
        """Return changes observed since the previous snapshot."""
        current = self._snapshot()
        created = set(current) - set(self._previous)
        deleted = set(self._previous) - set(current)
        common = set(current) & set(self._previous)
        events: list[SecurityEvent] = []

        deleted_by_state: dict[FileState, list[Path]] = {}
        for path in deleted:
            deleted_by_state.setdefault(self._previous[path], []).append(path)
        for path in sorted(created):
            candidates = deleted_by_state.get(current[path])
            if candidates:
                source = candidates.pop()
                deleted.remove(source)
                events.append(self._event(EventType.FILE_MOVED, source, path))
            else:
                events.append(self._event(EventType.FILE_CREATED, path))

        events.extend(
            self._event(EventType.FILE_DELETED, path) for path in sorted(deleted)
        )
        events.extend(
            self._event(EventType.FILE_MODIFIED, path)
            for path in sorted(common)
            if current[path] != self._previous[path]
        )
        self._previous = current
        return tuple(events)

    def _snapshot(self) -> dict[Path, FileState]:
        if not self.root.is_dir():
            raise ValueError(f"monitor path is not a directory: {self.root}")
        snapshot: dict[Path, FileState] = {}
        for path in self.root.rglob("*"):
            try:
                if path.is_file() and not path.is_symlink():
                    stat = path.stat()
                    snapshot[path] = FileState(stat.st_size, stat.st_mtime_ns)
            except (FileNotFoundError, PermissionError, OSError):
                continue
        return snapshot

    def _event(
        self,
        event_type: EventType,
        path: Path,
        destination_path: Path | None = None,
    ) -> SecurityEvent:
        return SecurityEvent(
            event_type=event_type,
            timestamp=self._now(),
            source="filesystem",
            platform=platform.system(),
            host_id=self._host_id,
            collector_name="polling-filesystem",
            path=path,
            destination_path=destination_path,
        )

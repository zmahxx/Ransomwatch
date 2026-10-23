"""Normalized, platform-neutral security events."""

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from pathlib import Path
from types import MappingProxyType
from uuid import UUID, uuid4


class EventType(StrEnum):
    """Event types understood by the detection pipeline."""

    FILE_CREATED = "file_created"
    FILE_MODIFIED = "file_modified"
    FILE_MOVED = "file_moved"
    FILE_DELETED = "file_deleted"
    PROCESS_STARTED = "process_started"
    PROCESS_STOPPED = "process_stopped"
    PROCESS_SAMPLE = "process_sample"
    SYSTEM_SAMPLE = "system_sample"
    NETWORK_ACTIVITY = "network_activity"


@dataclass(frozen=True, slots=True)
class SecurityEvent:
    """An immutable normalized event emitted by a collector."""

    event_type: EventType
    timestamp: datetime
    source: str
    platform: str
    host_id: str
    collector_name: str
    path: Path | None = None
    destination_path: Path | None = None
    process_id: int | None = None
    process_name: str | None = None
    metadata: Mapping[str, str] = field(default_factory=lambda: MappingProxyType({}))
    event_id: UUID = field(default_factory=uuid4)
    schema_version: int = 1

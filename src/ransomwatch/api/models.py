"""Public dashboard response contracts."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AlertResponse(BaseModel):
    """Dashboard representation of a stored detection alert."""

    id: str
    rule_id: Literal["RW001", "RW002", "RW003"]
    title: str
    severity: Literal["medium", "high", "critical"]
    status: Literal["new", "investigating", "acknowledged", "resolved", "dismissed"]
    timestamp: datetime
    description: str
    event_count: int
    window_seconds: float
    affected_paths: list[str]
    evidence: dict[str, int | float | str]


class EventResponse(BaseModel):
    """Metadata-only normalized filesystem event."""

    event_id: str
    event_type: Literal["file_created", "file_modified", "file_moved", "file_deleted"]
    timestamp: datetime
    source: str
    platform: str
    host_id: str
    collector_name: str
    path: str | None = None
    destination_path: str | None = None
    process_id: int | None = None
    process_name: str | None = None
    metadata: dict[str, str]
    schema_version: int


class DirectoryResponse(BaseModel):
    """Status of the directory watched by this detector process."""

    id: str
    path: str
    status: Literal["active", "paused", "error"]
    file_count: int
    last_scan: datetime
    recent_event_count: int
    note: str | None = None


class RuleResponse(BaseModel):
    """Effective configuration for one explainable detection rule."""

    id: Literal["RW001", "RW002", "RW003"]
    name: str
    description: str
    severity: Literal["medium", "high", "critical"]
    enabled: bool = True
    threshold: int
    threshold_label: str
    window_seconds: float
    cooldown_seconds: float
    event_types: list[
        Literal["file_created", "file_modified", "file_moved", "file_deleted"]
    ]


class ActivityPointResponse(BaseModel):
    """One time bucket used by the overview activity chart."""

    timestamp: datetime
    label: str
    file_created: int = 0
    file_modified: int = 0
    file_moved: int = 0
    file_deleted: int = 0
    alert_id: str | None = None


class TrendResponse(BaseModel):
    """Small metric deltas displayed by summary cards."""

    critical_alerts: float = 0
    filesystem_events: float = 0
    monitored_files: float = 0


class OverviewResponse(BaseModel):
    """Top-level dashboard counters."""

    threat_level: Literal["Low", "Guarded", "Elevated", "Severe"]
    critical_alerts: int
    filesystem_events: int
    monitored_files: int
    trends: TrendResponse = Field(default_factory=TrendResponse)


class DemoResponse(BaseModel):
    """Result of the explicitly requested harmless demo action."""

    renamed_files: int
    alerts_created: int

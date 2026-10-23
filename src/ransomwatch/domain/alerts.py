"""Explainable alerts produced by the detection engine."""

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from pathlib import Path


class Severity(StrEnum):
    """Human-readable alert severity."""

    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass(frozen=True, slots=True)
class DetectionAlert:
    """A rule match with enough evidence for an analyst to understand it."""

    rule_id: str
    title: str
    severity: Severity
    timestamp: datetime
    description: str
    event_count: int
    window_seconds: float
    affected_paths: tuple[Path, ...]
    evidence: Mapping[str, int | float | str]


@dataclass(frozen=True, slots=True)
class StoredAlert:
    """A detection alert with dashboard identity and workflow status."""

    id: str
    alert: DetectionAlert
    status: str = "new"

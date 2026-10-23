"""Tests for the explainable sliding-window detection rules."""

from datetime import UTC, datetime, timedelta
from pathlib import Path

from ransomwatch.domain.alerts import Severity
from ransomwatch.domain.detection import DetectionEngine, DetectionPolicy
from ransomwatch.domain.events import EventType, SecurityEvent


def _event(index: int, timestamp: datetime) -> SecurityEvent:
    return SecurityEvent(
        event_type=EventType.FILE_MOVED,
        timestamp=timestamp,
        source="filesystem",
        platform="test",
        host_id="test-host",
        collector_name="test",
        path=Path(f"sample-{index}.txt"),
        destination_path=Path(f"sample-{index}.locked"),
    )


def test_rename_burst_emits_explainable_alert() -> None:
    policy = DetectionPolicy(
        mutation_threshold=100,
        rename_threshold=3,
        delete_threshold=100,
    )
    engine = DetectionEngine(policy)
    started = datetime(2026, 1, 1, tzinfo=UTC)

    assert engine.process(_event(0, started)) == ()
    assert engine.process(_event(1, started + timedelta(seconds=1))) == ()
    alerts = engine.process(_event(2, started + timedelta(seconds=2)))

    assert len(alerts) == 1
    assert alerts[0].rule_id == "RW002"
    assert alerts[0].severity == Severity.CRITICAL
    assert alerts[0].evidence == {"file_moved": 3}
    assert len(alerts[0].affected_paths) == 3


def test_events_outside_window_do_not_accumulate() -> None:
    policy = DetectionPolicy(
        window_seconds=2,
        mutation_threshold=100,
        rename_threshold=2,
        delete_threshold=100,
    )
    engine = DetectionEngine(policy)
    started = datetime(2026, 1, 1, tzinfo=UTC)

    engine.process(_event(0, started))

    assert engine.process(_event(1, started + timedelta(seconds=3))) == ()


def test_alert_cooldown_suppresses_duplicate_noise() -> None:
    policy = DetectionPolicy(
        mutation_threshold=100,
        rename_threshold=2,
        delete_threshold=100,
        alert_cooldown_seconds=10,
    )
    engine = DetectionEngine(policy)
    started = datetime(2026, 1, 1, tzinfo=UTC)

    engine.process(_event(0, started))
    assert len(engine.process(_event(1, started + timedelta(seconds=1)))) == 1
    assert engine.process(_event(2, started + timedelta(seconds=2))) == ()

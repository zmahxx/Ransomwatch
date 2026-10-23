"""Tests for durable event and alert history."""

from pathlib import Path

from ransomwatch.application.monitoring import MonitoringService
from ransomwatch.domain.detection import DetectionPolicy
from ransomwatch.infrastructure.sqlite import SQLiteRepository
from ransomwatch.simulator import prepare_sandbox


def test_events_and_alerts_survive_service_restart(tmp_path: Path) -> None:
    sandbox = tmp_path / "sandbox"
    database = tmp_path / "ransomwatch.db"
    prepare_sandbox(sandbox, 2)
    policy = DetectionPolicy(
        mutation_threshold=100,
        rename_threshold=8,
        delete_threshold=100,
    )
    first = MonitoringService(sandbox, policy, repository=SQLiteRepository(database))

    first.run_safe_demo(12)
    second = MonitoringService(sandbox, policy, repository=SQLiteRepository(database))

    assert len(second.events) == 12
    assert len(second.alerts) == 1
    assert second.alerts[0].alert.rule_id == "RW002"
    assert {event.event_id for event in second.events} == {
        event.event_id for event in first.events
    }

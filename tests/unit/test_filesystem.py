"""Tests for metadata-only filesystem collection."""

from pathlib import Path

import pytest

from ransomwatch.domain.events import EventType
from ransomwatch.infrastructure.filesystem import PollingFileCollector
from ransomwatch.simulator import prepare_sandbox, simulate_rename_burst


def test_collector_detects_simulated_renames(tmp_path: Path) -> None:
    prepare_sandbox(tmp_path, 8)
    collector = PollingFileCollector(tmp_path, host_id="test-host")
    assert collector.prime() == 9

    simulate_rename_burst(tmp_path)
    events = collector.collect()

    assert len(events) == 8
    assert all(event.event_type == EventType.FILE_MOVED for event in events)
    assert all(event.destination_path is not None for event in events)


def test_collector_detects_create_modify_and_delete(tmp_path: Path) -> None:
    collector = PollingFileCollector(tmp_path, host_id="test-host")
    collector.prime()
    path = tmp_path / "sample.txt"
    path.write_text("first", encoding="utf-8")
    assert collector.collect()[0].event_type == EventType.FILE_CREATED

    path.write_text("longer second value", encoding="utf-8")
    assert collector.collect()[0].event_type == EventType.FILE_MODIFIED

    path.unlink()
    assert collector.collect()[0].event_type == EventType.FILE_DELETED


def test_simulator_refuses_unmarked_directory(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="refusing"):
        simulate_rename_burst(tmp_path)

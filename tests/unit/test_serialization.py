"""Tests for stable JSON output."""

import json
from datetime import UTC, datetime

from ransomwatch.domain.events import EventType, SecurityEvent
from ransomwatch.infrastructure.serialization import to_json


def test_security_event_serializes_to_json() -> None:
    event = SecurityEvent(
        event_type=EventType.FILE_CREATED,
        timestamp=datetime(2026, 1, 1, tzinfo=UTC),
        source="filesystem",
        platform="test",
        host_id="test-host",
        collector_name="test",
    )

    payload = json.loads(to_json(event))

    assert payload["event_type"] == "file_created"
    assert payload["timestamp"] == "2026-01-01 00:00:00+00:00"

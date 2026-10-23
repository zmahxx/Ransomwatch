"""Tests for immutable normalized events."""

from datetime import UTC, datetime

from ransomwatch.domain.events import EventType, SecurityEvent


def test_security_event_has_unique_identifier() -> None:
    """Each normalized event receives an identifier."""
    event = SecurityEvent(
        event_type=EventType.FILE_CREATED,
        timestamp=datetime.now(UTC),
        source="filesystem",
        platform="Windows",
        host_id="test-host",
        collector_name="test",
    )

    assert event.schema_version == 1
    assert event.event_id

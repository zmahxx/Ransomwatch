"""Tests for settings validation."""

import pytest
from pydantic import ValidationError

from ransomwatch.config.models import Settings


def test_settings_have_safe_defaults() -> None:
    """The service remains local-only by default."""
    settings = Settings()

    assert settings.dashboard_host == "127.0.0.1"
    assert settings.queue_size == 2_000


def test_queue_size_must_be_positive() -> None:
    """Bounded queues cannot be disabled through configuration."""
    with pytest.raises(ValidationError):
        Settings(queue_size=0)

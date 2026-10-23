"""Time abstraction for deterministic application services."""

from datetime import datetime
from typing import Protocol


class Clock(Protocol):
    """Provides the current UTC time without coupling domain code to system time."""

    def now(self) -> datetime:
        """Return the current UTC timestamp."""

"""Minimal structured logging configuration."""

import logging
from datetime import UTC, datetime


class JsonFormatter(logging.Formatter):
    """Render standard logging records as compact JSON-like structured messages."""

    def format(self, record: logging.LogRecord) -> str:
        """Format one record with UTC timestamp and component fields."""
        timestamp = datetime.fromtimestamp(record.created, UTC).isoformat()
        component = record.name
        message = record.getMessage().replace('"', '\\"')
        return (
            f'{{"timestamp":"{timestamp}","level":"{record.levelname}",'
            f'"component":"{component}","message":"{message}"}}'
        )


def configure_logging(level: str) -> None:
    """Configure the root logger once for command-line execution."""
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    logging.basicConfig(level=level.upper(), handlers=[handler], force=True)

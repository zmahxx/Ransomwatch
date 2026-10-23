"""JSON serialization at the infrastructure boundary."""

import json
from collections.abc import Mapping
from dataclasses import fields, is_dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any
from uuid import UUID


def to_json(value: object) -> str:
    """Serialize a dataclass or JSON-compatible value predictably."""
    payload = (
        {item.name: getattr(value, item.name) for item in fields(value)}
        if is_dataclass(value) and not isinstance(value, type)
        else value
    )
    return json.dumps(payload, default=_default, sort_keys=True)


def _default(value: Any) -> Any:
    if isinstance(value, (datetime, Path, UUID, Enum)):
        return str(value)
    if isinstance(value, Mapping):
        return dict(value)
    raise TypeError(f"cannot serialize {type(value).__name__}")

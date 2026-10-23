"""Best-effort process attribution using observed open file handles."""

import os
import time
from dataclasses import dataclass
from pathlib import Path

import psutil


@dataclass(frozen=True, slots=True)
class ProcessIdentity:
    """A process recently observed holding a file open."""

    process_id: int
    process_name: str
    observed_at: float


class OpenFileProcessAttributor:
    """Cache path-to-process observations without inspecting file contents."""

    def __init__(self, ttl_seconds: float = 5.0) -> None:
        self.ttl_seconds = ttl_seconds
        self._by_path: dict[str, ProcessIdentity] = {}

    def sample(self) -> int:
        """Observe accessible process handles and return the number of mapped paths."""
        observed_at = time.monotonic()
        for process in psutil.process_iter(["pid", "name"]):
            try:
                name = process.info.get("name") or "unknown"
                identity = ProcessIdentity(process.pid, str(name), observed_at)
                for opened in process.open_files():
                    self._by_path[_path_key(Path(opened.path))] = identity
            except (psutil.AccessDenied, psutil.NoSuchProcess, OSError):
                continue
        self._prune(observed_at)
        return len(self._by_path)

    def resolve(self, *paths: Path | None) -> ProcessIdentity | None:
        """Return the freshest unexpired identity matching one of the paths."""
        now = time.monotonic()
        self._prune(now)
        matches = [
            self._by_path.get(_path_key(path)) for path in paths if path is not None
        ]
        valid = [identity for identity in matches if identity is not None]
        return max(valid, key=lambda identity: identity.observed_at, default=None)

    def _prune(self, now: float) -> None:
        expired = [
            path
            for path, identity in self._by_path.items()
            if now - identity.observed_at > self.ttl_seconds
        ]
        for path in expired:
            del self._by_path[path]


def _path_key(path: Path) -> str:
    return os.path.normcase(os.path.normpath(str(path.absolute())))

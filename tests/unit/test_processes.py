"""Tests for cautious open-file process attribution."""

from pathlib import Path
from types import SimpleNamespace
from typing import Any

import psutil

from ransomwatch.infrastructure.processes import OpenFileProcessAttributor


class FakeProcess:
    """Small psutil process stand-in exposing one open file."""

    pid = 4242
    info = {"pid": 4242, "name": "editor.exe"}

    def __init__(self, path: Path) -> None:
        self.path = path

    def open_files(self) -> list[SimpleNamespace]:
        return [SimpleNamespace(path=str(self.path))]


def test_open_file_snapshot_attributes_matching_path(
    tmp_path: Path, monkeypatch: Any
) -> None:
    path = tmp_path / "report.docx"
    fake = FakeProcess(path)
    monkeypatch.setattr(psutil, "process_iter", lambda _: [fake])
    attributor = OpenFileProcessAttributor(ttl_seconds=5)

    assert attributor.sample() == 1
    identity = attributor.resolve(path)

    assert identity is not None
    assert identity.process_id == 4242
    assert identity.process_name == "editor.exe"


def test_unobserved_path_has_no_attribution(tmp_path: Path, monkeypatch: Any) -> None:
    monkeypatch.setattr(psutil, "process_iter", lambda _: [])
    attributor = OpenFileProcessAttributor()
    attributor.sample()

    assert attributor.resolve(tmp_path / "missing.txt") is None

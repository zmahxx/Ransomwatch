"""Harmless file-activity generator restricted to an explicit sandbox."""

from pathlib import Path


def prepare_sandbox(root: Path, file_count: int) -> tuple[Path, ...]:
    """Create disposable marker files inside a dedicated sandbox directory."""
    root = root.resolve()
    root.mkdir(parents=True, exist_ok=True)
    marker = root / ".ransomwatch-sandbox"
    marker.touch(exist_ok=True)
    for old_output in root.glob("sample-*.txt.rw-simulated"):
        old_output.unlink()
    files: list[Path] = []
    for index in range(file_count):
        path = root / f"sample-{index:03d}.txt"
        path.touch(exist_ok=True)
        files.append(path)
    return tuple(files)


def simulate_rename_burst(root: Path) -> tuple[tuple[Path, Path], ...]:
    """Rename only simulator-owned files; no data is encrypted or overwritten."""
    root = root.resolve()
    marker = root / ".ransomwatch-sandbox"
    if not marker.is_file():
        raise ValueError("refusing to simulate outside a marked RansomWatch sandbox")
    renamed: list[tuple[Path, Path]] = []
    for source in sorted(root.glob("sample-*.txt")):
        destination = source.with_suffix(".txt.rw-simulated")
        source.rename(destination)
        renamed.append((source, destination))
    return tuple(renamed)

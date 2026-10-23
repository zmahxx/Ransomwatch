"""Command-line entry point for RansomWatch."""

import time
from pathlib import Path
from typing import Annotated

import typer
import uvicorn

from ransomwatch.api.app import create_app
from ransomwatch.config.models import get_settings
from ransomwatch.domain.detection import DetectionEngine, DetectionPolicy
from ransomwatch.infrastructure.filesystem import PollingFileCollector
from ransomwatch.infrastructure.logging import configure_logging
from ransomwatch.infrastructure.serialization import to_json
from ransomwatch.simulator import prepare_sandbox, simulate_rename_burst

app = typer.Typer(help="RansomWatch local ransomware-behavior monitoring.")


@app.callback()
def main() -> None:
    """Prepare safe process-wide runtime configuration."""
    settings = get_settings()
    configure_logging(settings.log_level)


@app.command()
def capabilities() -> None:
    """Report current runtime capabilities and deliberate limitations."""
    typer.echo("Metadata-only directory monitoring: available")
    typer.echo("Sliding-window behavior detection: available")
    typer.echo("SQLite event and alert persistence: available")
    typer.echo("Safe rename-burst simulator: available")
    typer.echo("Best-effort open-file process attribution: available")
    typer.echo("System-wide monitoring: not installed")
    typer.echo("Automatic process response: disabled")
    typer.echo("File-content inspection: disabled")


@app.command("config-validate")
def config_validate() -> None:
    """Validate configuration and print the safe public runtime values."""
    settings = get_settings()
    typer.echo(f"Configuration valid; queue_size={settings.queue_size}")


def _engine() -> DetectionEngine:
    return DetectionEngine(_policy())


def _policy() -> DetectionPolicy:
    settings = get_settings()
    return DetectionPolicy(
        window_seconds=settings.detection_window_seconds,
        mutation_threshold=settings.mutation_threshold,
        rename_threshold=settings.rename_threshold,
        delete_threshold=settings.delete_threshold,
        alert_cooldown_seconds=settings.alert_cooldown_seconds,
    )


def _process_once(
    collector: PollingFileCollector, engine: DetectionEngine, show_events: bool
) -> int:
    alert_count = 0
    for event in collector.collect():
        if show_events:
            typer.echo(to_json(event))
        for alert in engine.process(event):
            typer.echo(to_json(alert), err=True)
            alert_count += 1
    return alert_count


@app.command()
def monitor(
    path: Annotated[Path, typer.Argument(help="Existing directory to monitor.")],
    interval: Annotated[
        float, typer.Option(min=0.05, help="Polling interval in seconds.")
    ] = 1.0,
    duration: Annotated[
        float,
        typer.Option(min=0.0, help="Seconds to run; zero runs until interrupted."),
    ] = 0.0,
    show_events: Annotated[
        bool, typer.Option(help="Print normalized events as JSON.")
    ] = False,
) -> None:
    """Monitor one directory and print explainable JSON alerts."""
    if not path.is_dir():
        raise typer.BadParameter("path must be an existing directory")
    collector = PollingFileCollector(path)
    baseline_count = collector.prime()
    typer.echo(f"Monitoring {collector.root} ({baseline_count} baseline files)")
    engine = _engine()
    started = time.monotonic()
    try:
        while duration == 0 or time.monotonic() - started < duration:
            time.sleep(interval)
            _process_once(collector, engine, show_events)
    except KeyboardInterrupt:
        typer.echo("Monitoring stopped")


@app.command()
def demo(
    path: Annotated[
        Path | None,
        typer.Option(
            help="Dedicated demo sandbox; defaults to configured sandbox path."
        ),
    ] = None,
    file_count: Annotated[int, typer.Option(min=2, max=1_000)] = 12,
) -> None:
    """Run a harmless end-to-end rename-burst detection demo."""
    settings = get_settings()
    sandbox = (path or settings.simulator_sandbox_path).resolve()
    files = prepare_sandbox(sandbox, file_count)
    collector = PollingFileCollector(sandbox)
    collector.prime()
    renamed = simulate_rename_burst(sandbox)
    alerts = _process_once(collector, _engine(), show_events=False)
    typer.echo(
        f"Demo renamed {len(renamed)} of {len(files)} empty marker files; "
        f"alerts={alerts}"
    )
    if alerts == 0:
        typer.echo(
            "No alert: file_count may be below the configured rename threshold.",
            err=True,
        )


@app.command()
def serve(
    path: Annotated[
        Path | None,
        typer.Option(help="Directory to monitor; defaults to the simulator sandbox."),
    ] = None,
    host: Annotated[
        str, typer.Option(help="API bind address; keep loopback for local-only use.")
    ] = "127.0.0.1",
    port: Annotated[int | None, typer.Option(min=1, max=65535)] = None,
) -> None:
    """Serve the detector's local dashboard API."""
    settings = get_settings()
    root = (path or settings.simulator_sandbox_path).resolve()
    if not root.is_dir():
        raise typer.BadParameter(
            "path must exist; run `ransomwatch demo` to prepare the default sandbox"
        )
    if host not in {"127.0.0.1", "localhost", "::1"}:
        typer.echo(
            "Warning: a non-loopback host exposes metadata to the network.", err=True
        )
    uvicorn.run(
        create_app(
            root,
            _policy(),
            database_path=settings.database_path,
            process_attribution=settings.process_attribution_enabled,
            attribution_ttl_seconds=settings.process_attribution_ttl_seconds,
            poll_interval_seconds=settings.aggregation_interval_seconds,
        ),
        host=host,
        port=port or settings.dashboard_port,
        log_level=settings.log_level.lower(),
    )

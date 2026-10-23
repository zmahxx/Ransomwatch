"""FastAPI application exposing the local detector to the dashboard."""

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Literal, cast

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from ransomwatch.api.models import (
    ActivityPointResponse,
    AlertResponse,
    DemoResponse,
    DirectoryResponse,
    EventResponse,
    OverviewResponse,
    RuleResponse,
)
from ransomwatch.application.monitoring import MonitoringService
from ransomwatch.domain.alerts import Severity, StoredAlert
from ransomwatch.domain.detection import DetectionPolicy
from ransomwatch.domain.events import SecurityEvent
from ransomwatch.infrastructure.processes import OpenFileProcessAttributor
from ransomwatch.infrastructure.sqlite import SQLiteRepository

RuleId = Literal["RW001", "RW002", "RW003"]
ApiEventType = Literal["file_created", "file_modified", "file_moved", "file_deleted"]
TimeRange = Literal["1H", "6H", "24H", "7D"]

RANGE_DURATION: dict[TimeRange, timedelta] = {
    "1H": timedelta(hours=1),
    "6H": timedelta(hours=6),
    "24H": timedelta(hours=24),
    "7D": timedelta(days=7),
}
RANGE_BUCKETS: dict[TimeRange, int] = {"1H": 12, "6H": 12, "24H": 24, "7D": 28}


def create_app(
    root: Path,
    policy: DetectionPolicy | None = None,
    *,
    database_path: Path | None = None,
    process_attribution: bool = True,
    attribution_ttl_seconds: float = 5.0,
    poll_interval_seconds: float = 1.0,
) -> FastAPI:
    """Create a local-only dashboard API for one monitored directory."""
    repository = SQLiteRepository(database_path) if database_path else None
    attributor = (
        OpenFileProcessAttributor(attribution_ttl_seconds)
        if process_attribution
        else None
    )
    service = MonitoringService(
        root, policy, repository=repository, attributor=attributor
    )

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        stop = asyncio.Event()

        async def poll() -> None:
            while not stop.is_set():
                await asyncio.to_thread(service.scan)
                try:
                    await asyncio.wait_for(stop.wait(), timeout=poll_interval_seconds)
                except TimeoutError:
                    continue

        task = asyncio.create_task(poll())
        try:
            yield
        finally:
            stop.set()
            await task

    app = FastAPI(
        title="RansomWatch API",
        version="0.1.0",
        description="Local metadata-only ransomware behavior telemetry.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1:3000",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:8080",
            "http://localhost:8080",
        ],
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    @app.get("/api/v1/status")
    def status() -> dict[str, str | int]:
        service.scan()
        return {
            "status": service.status,
            "monitored_path": str(service.root),
            "files": service.file_count,
        }

    @app.get("/api/v1/overview")
    def overview() -> OverviewResponse:
        alerts = service.recent_alerts()
        events = service.recent_events(within=timedelta(hours=24))
        critical = sum(
            stored.alert.severity == Severity.CRITICAL
            and stored.status not in {"resolved", "dismissed"}
            for stored in alerts
        )
        threat_level: Literal["Low", "Guarded", "Elevated", "Severe"]
        if critical >= 3:
            threat_level = "Severe"
        elif critical:
            threat_level = "Elevated"
        elif events:
            threat_level = "Guarded"
        else:
            threat_level = "Low"
        return OverviewResponse(
            threat_level=threat_level,
            critical_alerts=critical,
            filesystem_events=len(events),
            monitored_files=service.file_count,
        )

    @app.get("/api/v1/activity")
    def activity(range: TimeRange = "24H") -> list[ActivityPointResponse]:
        return _activity_points(service, range)

    @app.get("/api/v1/alerts")
    def alerts() -> list[AlertResponse]:
        return [_alert_response(stored) for stored in service.recent_alerts()]

    @app.get("/api/v1/alerts/{alert_id}")
    def alert(alert_id: str) -> AlertResponse:
        match = next(
            (item for item in service.recent_alerts() if item.id == alert_id), None
        )
        if match is None:
            raise HTTPException(status_code=404, detail=f"alert {alert_id} not found")
        return _alert_response(match)

    @app.get("/api/v1/events")
    def events() -> list[EventResponse]:
        return [_event_response(event) for event in service.recent_events()]

    @app.get("/api/v1/directories")
    def directories() -> list[DirectoryResponse]:
        service.scan()
        return [
            DirectoryResponse(
                id="directory-primary",
                path=str(service.root),
                status=cast(Literal["active", "paused", "error"], service.status),
                file_count=service.file_count,
                last_scan=service.last_scan,
                recent_event_count=len(
                    service.recent_events(within=timedelta(hours=24))
                ),
                note=service.error,
            )
        ]

    @app.get("/api/v1/rules")
    def rules() -> list[RuleResponse]:
        return _rule_responses(service.engine.policy)

    @app.post("/api/v1/demo")
    def demo(file_count: int = Query(default=12, ge=2, le=1_000)) -> DemoResponse:
        try:
            renamed, created = service.run_safe_demo(file_count)
        except ValueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return DemoResponse(renamed_files=renamed, alerts_created=created)

    return app


def _alert_response(stored: StoredAlert) -> AlertResponse:
    alert = stored.alert
    return AlertResponse(
        id=stored.id,
        rule_id=cast(RuleId, alert.rule_id),
        title=alert.title,
        severity=alert.severity.value,
        status=cast(
            Literal["new", "investigating", "acknowledged", "resolved", "dismissed"],
            stored.status,
        ),
        timestamp=alert.timestamp,
        description=alert.description,
        event_count=alert.event_count,
        window_seconds=alert.window_seconds,
        affected_paths=[str(path) for path in alert.affected_paths],
        evidence=dict(alert.evidence),
    )


def _event_response(event: SecurityEvent) -> EventResponse:
    return EventResponse(
        event_id=str(event.event_id),
        event_type=cast(ApiEventType, event.event_type.value),
        timestamp=event.timestamp,
        source=event.source,
        platform=event.platform,
        host_id=event.host_id,
        collector_name=event.collector_name,
        path=str(event.path) if event.path else None,
        destination_path=(
            str(event.destination_path) if event.destination_path else None
        ),
        process_id=event.process_id,
        process_name=event.process_name,
        metadata=dict(event.metadata),
        schema_version=event.schema_version,
    )


def _activity_points(
    service: MonitoringService, range_name: TimeRange
) -> list[ActivityPointResponse]:
    duration = RANGE_DURATION[range_name]
    bucket_count = RANGE_BUCKETS[range_name]
    end = datetime.now(UTC)
    start = end - duration
    bucket_seconds = duration.total_seconds() / bucket_count
    points = [
        ActivityPointResponse(
            timestamp=start + timedelta(seconds=bucket_seconds * index),
            label=(
                (start + timedelta(seconds=bucket_seconds * index)).strftime("%m-%d")
                if range_name == "7D"
                else (start + timedelta(seconds=bucket_seconds * index)).strftime(
                    "%H:%M"
                )
            ),
        )
        for index in range(bucket_count)
    ]
    for event in service.recent_events(within=duration):
        index = min(
            bucket_count - 1,
            max(0, int((event.timestamp - start).total_seconds() / bucket_seconds)),
        )
        field = cast(ApiEventType, event.event_type.value)
        setattr(points[index], field, getattr(points[index], field) + 1)
    for stored in service.recent_alerts():
        if stored.alert.severity != Severity.CRITICAL or stored.alert.timestamp < start:
            continue
        index = min(
            bucket_count - 1,
            max(
                0,
                int((stored.alert.timestamp - start).total_seconds() / bucket_seconds),
            ),
        )
        points[index].alert_id = stored.id
    return points


def _rule_responses(policy: DetectionPolicy) -> list[RuleResponse]:
    return [
        RuleResponse(
            id="RW001",
            name="High-Rate File Mutation",
            description="Flags a burst of modify, move, or delete operations.",
            severity="high",
            threshold=policy.mutation_threshold,
            threshold_label="modified, moved, or deleted files",
            window_seconds=policy.window_seconds,
            cooldown_seconds=policy.alert_cooldown_seconds,
            event_types=["file_modified", "file_moved", "file_deleted"],
        ),
        RuleResponse(
            id="RW002",
            name="Rapid File Rename Burst",
            description="Flags many renames inside one sliding window.",
            severity="critical",
            threshold=policy.rename_threshold,
            threshold_label="renamed files",
            window_seconds=policy.window_seconds,
            cooldown_seconds=policy.alert_cooldown_seconds,
            event_types=["file_moved"],
        ),
        RuleResponse(
            id="RW003",
            name="Rapid File Deletion Burst",
            description="Flags rapid deletion volume.",
            severity="high",
            threshold=policy.delete_threshold,
            threshold_label="deleted files",
            window_seconds=policy.window_seconds,
            cooldown_seconds=policy.alert_cooldown_seconds,
            event_types=["file_deleted"],
        ),
    ]

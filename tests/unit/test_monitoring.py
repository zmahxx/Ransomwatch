"""Tests for the live monitoring service and dashboard API contract."""

import asyncio
from pathlib import Path

import httpx

from ransomwatch.api.app import create_app
from ransomwatch.application.monitoring import MonitoringService
from ransomwatch.domain.detection import DetectionPolicy
from ransomwatch.simulator import prepare_sandbox


def _policy() -> DetectionPolicy:
    return DetectionPolicy(
        mutation_threshold=100,
        rename_threshold=8,
        delete_threshold=100,
    )


def test_monitoring_service_detects_safe_demo(tmp_path: Path) -> None:
    prepare_sandbox(tmp_path, 2)
    service = MonitoringService(tmp_path, _policy())

    renamed, alerts_created = service.run_safe_demo(12)

    assert renamed == 12
    assert alerts_created == 1
    assert len(service.events) == 12
    assert service.alerts[0].alert.rule_id == "RW002"
    assert service.alerts[0].alert.event_count == 8


def test_dashboard_api_returns_live_contracts(tmp_path: Path) -> None:
    prepare_sandbox(tmp_path, 2)
    app = create_app(tmp_path, _policy(), process_attribution=False)

    async def exercise_api() -> tuple[httpx.Response, ...]:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            return (
                await client.post("/api/v1/demo", params={"file_count": 12}),
                await client.get("/api/v1/alerts"),
                await client.get("/api/v1/events"),
                await client.get("/api/v1/rules"),
                await client.get("/api/v1/overview"),
            )

    demo, alerts, events, rules, overview = asyncio.run(exercise_api())

    assert demo.status_code == 200
    assert demo.json() == {"renamed_files": 12, "alerts_created": 1}
    assert alerts.json()[0]["rule_id"] == "RW002"
    assert len(events.json()) == 12
    assert {rule["id"] for rule in rules.json()} == {"RW001", "RW002", "RW003"}
    assert overview.json()["critical_alerts"] == 1

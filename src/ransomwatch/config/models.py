"""Configuration models with safe local defaults."""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables or safe defaults."""

    model_config = SettingsConfigDict(env_prefix="RANSOMWATCH_", extra="ignore")

    database_path: Path = Path("ransomwatch.db")
    log_level: str = "INFO"
    queue_size: int = Field(default=2_000, ge=1, le=100_000)
    aggregation_interval_seconds: float = Field(default=1.0, gt=0, le=60)
    dashboard_host: str = "127.0.0.1"
    dashboard_port: int = Field(default=8000, ge=1, le=65535)
    simulator_sandbox_path: Path = Path("simulator-sandbox")
    detection_window_seconds: float = Field(default=10.0, gt=0, le=300)
    mutation_threshold: int = Field(default=20, ge=2, le=100_000)
    rename_threshold: int = Field(default=8, ge=2, le=100_000)
    delete_threshold: int = Field(default=10, ge=2, le=100_000)
    alert_cooldown_seconds: float = Field(default=10.0, ge=0, le=3600)
    process_attribution_enabled: bool = True
    process_attribution_ttl_seconds: float = Field(default=5.0, gt=0, le=60)


def get_settings() -> Settings:
    """Construct settings from the current environment."""

    return Settings()

# RansomWatch: Behavior-Based Ransomware Monitoring Prototype

RansomWatch is a local defensive prototype that watches file metadata and applies explainable sliding-window rules to flag bursts of file changes. The project was created as a personal project under its owner's direction to explore transparent local monitoring. It does not claim to prevent ransomware or establish measured detection effectiveness.

## Development and attribution

The owner directed the project requirements and overall product. Development used AI-assisted coding, and Lovable was used to generate dashboard UI components. The source does not track a line-by-line division between generated code and human-authored design, integration, and review, so this README does not claim that all code was manually written.

## Languages and frameworks

- Python 3.12+, FastAPI, Pydantic Settings, Typer, and SQLite
- Filesystem polling and best-effort process attribution
- React, TypeScript, Vite, and TanStack Router for the dashboard
- pytest source

## Architecture

The backend separates event models and detection rules from monitoring orchestration, filesystem polling, process observations, SQLite persistence, the CLI, and FastAPI adapters. The dashboard uses a typed API client and presents activity, alerts, monitored directories, rules, and settings.

## Functionality represented in source

- Polls file paths, sizes, and modification times for a configured directory.
- Normalizes observed changes into events and evaluates bounded time windows.
- Applies configurable thresholds for changes, moves, and deletions.
- Attaches evidence and cooldown behavior to alerts, with bounded event history in SQLite.
- Exposes a local API and dashboard.
- Includes a marker-protected simulator that creates and renames synthetic empty files in a dedicated sandbox.

Process attribution is best-effort correlation and cannot prove which process caused a filesystem change. The collector does not inspect file contents or stop processes.

## Setup and configuration

Use Python 3.12 or later for the backend. The dashboard uses the dependencies in dashboard/package.json and its lockfiles. The commands below are documented from the manifests and CLI source but were not run during this review.

Backend:

    python -m pip install -e .
    ransomwatch demo
    ransomwatch serve

The demo uses the dedicated simulator sandbox. The API serves on 127.0.0.1:8000 by default. The dashboard API client uses http://127.0.0.1:8000/api/v1 unless VITE_RANSOMWATCH_API_URL is set. VITE_RANSOMWATCH_DEMO_MODE=true enables dashboard mock data. To run the dashboard:

    cd dashboard
    bun install
    bun run dev

The dashboard development server defaults to loopback. A network bind can expose dashboard access and monitored metadata.

Backend settings use the RANSOMWATCH_ environment prefix; defaults include the local database path, loopback API host, port 8000, and simulator-sandbox directory. The monitor command accepts an explicit existing directory. Use a dedicated test directory or the supplied sandbox. Binding the API to a non-loopback address can expose monitored file metadata to the network.

## Third-party components and licensing

The original RansomWatch project code is offered under the MIT License in LICENSE. That license does not relicense third-party components. Copied shadcn/ui source and relevant dependency details are documented in THIRD_PARTY_NOTICES.md; package implementations are resolved from the dashboard manifests and lockfiles rather than vendored in this repository.

## Limitations

- Rule matches are indicators; they can produce false positives and miss activity.
- Rename pairing is a metadata heuristic; process attribution is opportunistic.
- No real-world efficacy, prevention rate, or production deployment has been established.
- The dashboard includes generated UI components and mock-data support.
- Tests, installation, and builds have not been run for this publishing copy.




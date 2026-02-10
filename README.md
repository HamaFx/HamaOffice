# Hama Office

Standalone Agent Office dashboard for viewing OpenClaw agent activity, task queue, and telemetry.

## Run locally

```bash
npm install
npm run dev
```

## API endpoints

- `/api/workspace`
- `/api/agents`
- `/api/tasks`
- `/api/metrics`

## Env vars

- `AGENT_OFFICE_OPENCLAW_DIR` (default: `~/.openclaw`)
- `AGENT_OFFICE_WORKSPACE_DIR` (default: `~/clawd`)
- `AGENT_OFFICE_READ_TOKEN` (optional backend token)
- `VITE_AGENT_OFFICE_TOKEN` (optional frontend token passed to API)

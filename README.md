# Hama Office

Virtual operations workspace for OpenClaw agents.

- Dual-view app: `Virtual Office` (pixel scene) + `Dashboard` (metrics board)
- Agent identities: deterministic callsign, gait, accessory, palette
- Pixel office themes: day, night, and neon with animated ambience
- Animated office props: desks, terminals, server racks, coffee station, gate beacons
- Live sync: poll truth from backend + client-side movement simulation
- Cloud-ready backend: Vercel API routes with KV/Postgres adapters
- Local push gateway: stream OpenClaw snapshots/events to deployed Vercel app

## UI structure

- `src/pages/VirtualOffice.tsx`: virtual office composition
- `src/components/virtual-office/*`: virtual office sections (hero, controls, overview, scene panel, sidebar)
- `src/pages/AgentOffice.tsx`: dashboard composition
- `src/components/dashboard/*`: dashboard sections (hero, stats, roster, queue, metrics)
- `src/components/office/OfficeScene.tsx`: tile map and pixel scene renderer
- `src/styles/app-shell.css`: top-level site shell and navigation
- `src/styles/dashboard.css`: dashboard layout and component styling
- `src/styles/virtual-office.css`: virtual office layout + scene themes
- `src/index.css`: shared design tokens, primitives, and common utilities

## Run locally

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev`: run local app
- `npm run build`: production build
- `npm run lint`: eslint
- `npm run typecheck`: TypeScript checks
- `npm run test`: Vitest suite
- `npm run office:push -- --once`: send one local OpenClaw snapshot to ingest API
- `npm run office:push -- --watch --url=https://your-app.vercel.app/api/ingest`: continuous sync

## API endpoints

Read APIs:
- `GET /api/workspace`
- `GET /api/agents`
- `GET /api/tasks`
- `GET /api/metrics`
- `GET /api/office/state`
- `GET /api/office/timeline?limit=100`

Ingest APIs:
- `POST /api/ingest/snapshot`
- `POST /api/ingest/event`

## Environment variables

Copy `.env.example` and set the values you use.

Minimum for local dev:
- `AGENT_OFFICE_OPENCLAW_DIR`
- `AGENT_OFFICE_WORKSPACE_DIR`

Recommended for deployment:
- `AGENT_OFFICE_READ_TOKEN`
- `AGENT_OFFICE_INGEST_TOKEN`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `POSTGRES_URL`

## Data flow

1. OpenClaw runs on your machine and writes queue/telemetry/session files.
2. `scripts/push-openclaw-state.ts` reads those files and posts snapshots/events.
3. Vercel ingest routes validate payloads, enforce auth/rate limits, and store:
   - latest scene/workspace in KV
   - timeline + snapshot history in Postgres
4. UI polls `/api/office/state` and `/api/office/timeline`, then simulates movement between updates.

## Database migration

SQL migration for Postgres tables:

- `db/migrations/0001_office.sql`

Apply it to your Vercel Postgres database before enabling production history storage.

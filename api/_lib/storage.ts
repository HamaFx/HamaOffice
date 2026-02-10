import { kv } from '@vercel/kv';
import { sql } from '@vercel/postgres';
import type {
  AgentOfficeWorkspaceSnapshot,
  OfficeEvent,
  OfficeSceneSnapshot,
} from '../../shared/types.js';

const KEY_WORKSPACE = 'office:workspace:latest';
const KEY_SCENE = 'office:scene:latest';
const KEY_TIMELINE = 'office:timeline';

const MAX_TIMELINE = 500;

const memory = {
  workspace: null as AgentOfficeWorkspaceSnapshot | null,
  scene: null as OfficeSceneSnapshot | null,
  timeline: [] as OfficeEvent[],
  idempotency: new Map<string, number>(),
};

let schemaEnsured = false;

function hasKvConfig(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function hasPostgresConfig(): boolean {
  return Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL);
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function pruneIdempotency() {
  const current = nowSec();
  for (const [key, expiry] of memory.idempotency.entries()) {
    if (expiry <= current) {
      memory.idempotency.delete(key);
    }
  }
}

async function ensurePostgresSchema() {
  if (schemaEnsured || !hasPostgresConfig()) return;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS office_snapshots (
        id BIGSERIAL PRIMARY KEY,
        generated_at TIMESTAMPTZ NOT NULL,
        sync_status TEXT NOT NULL,
        source TEXT NOT NULL,
        agents_count INT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS office_events (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        agent_id TEXT,
        task_id TEXT,
        message TEXT NOT NULL,
        payload JSONB NOT NULL,
        inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    schemaEnsured = true;
  } catch {
    schemaEnsured = false;
  }
}

export async function getLatestWorkspace(): Promise<AgentOfficeWorkspaceSnapshot | null> {
  if (!hasKvConfig()) {
    return memory.workspace;
  }

  try {
    const stored = await kv.get<AgentOfficeWorkspaceSnapshot>(KEY_WORKSPACE);
    return stored ?? null;
  } catch {
    return memory.workspace;
  }
}

export async function setLatestWorkspace(workspace: AgentOfficeWorkspaceSnapshot): Promise<void> {
  memory.workspace = workspace;

  if (!hasKvConfig()) {
    return;
  }

  try {
    await kv.set(KEY_WORKSPACE, workspace, { ex: 60 * 60 * 6 });
  } catch {
    // Use memory fallback when KV is unavailable.
  }
}

export async function getLatestScene(): Promise<OfficeSceneSnapshot | null> {
  if (!hasKvConfig()) {
    return memory.scene;
  }

  try {
    const stored = await kv.get<OfficeSceneSnapshot>(KEY_SCENE);
    return stored ?? null;
  } catch {
    return memory.scene;
  }
}

export async function setLatestScene(scene: OfficeSceneSnapshot): Promise<void> {
  memory.scene = scene;

  if (!hasKvConfig()) {
    return;
  }

  try {
    await kv.set(KEY_SCENE, scene, { ex: 60 * 60 * 6 });
  } catch {
    // Use memory fallback when KV is unavailable.
  }
}

export async function getTimeline(limit: number): Promise<OfficeEvent[]> {
  const safeLimit = Math.max(1, Math.min(limit, 200));

  if (!hasKvConfig()) {
    return memory.timeline.slice(0, safeLimit);
  }

  try {
    const items = await kv.lrange<string>(KEY_TIMELINE, 0, safeLimit - 1);
    return items
      .map((entry) => {
        try {
          return JSON.parse(entry) as OfficeEvent;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is OfficeEvent => entry !== null);
  } catch {
    return memory.timeline.slice(0, safeLimit);
  }
}

export async function appendTimeline(events: OfficeEvent[]): Promise<void> {
  if (!events.length) return;

  memory.timeline = [...events, ...memory.timeline].slice(0, MAX_TIMELINE);

  if (!hasKvConfig()) {
    return;
  }

  try {
    const encoded = events.map((event) => JSON.stringify(event));
    await kv.lpush(KEY_TIMELINE, ...encoded);
    await kv.ltrim(KEY_TIMELINE, 0, MAX_TIMELINE - 1);
  } catch {
    // Use memory fallback when KV is unavailable.
  }
}

export async function markIdempotencyKey(key: string, ttlSec = 300): Promise<boolean> {
  pruneIdempotency();

  const existingExpiry = memory.idempotency.get(key);
  if (existingExpiry && existingExpiry > nowSec()) {
    return false;
  }

  memory.idempotency.set(key, nowSec() + ttlSec);

  if (!hasKvConfig()) {
    return true;
  }

  try {
    const response = await kv.set(`office:idempotency:${key}`, '1', {
      nx: true,
      ex: ttlSec,
    });

    if (response !== 'OK') {
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

export async function writeSnapshotHistory(scene: OfficeSceneSnapshot): Promise<void> {
  if (!hasPostgresConfig()) return;

  await ensurePostgresSchema();
  if (!schemaEnsured) return;

  try {
    await sql`
      INSERT INTO office_snapshots (generated_at, sync_status, source, agents_count, payload)
      VALUES (
        ${scene.generated_at}::timestamptz,
        ${scene.sync_status},
        ${scene.source},
        ${scene.agents.length},
        ${JSON.stringify(scene)}::jsonb
      )
    `;
  } catch {
    // Postgres history is optional for runtime behavior.
  }
}

export async function writeEventHistory(events: OfficeEvent[]): Promise<void> {
  if (!events.length || !hasPostgresConfig()) return;

  await ensurePostgresSchema();
  if (!schemaEnsured) return;

  for (const event of events) {
    try {
      await sql`
        INSERT INTO office_events (id, created_at, type, severity, agent_id, task_id, message, payload)
        VALUES (
          ${event.id},
          ${event.createdAt}::timestamptz,
          ${event.type},
          ${event.severity},
          ${event.agentId ?? null},
          ${event.taskId ?? null},
          ${event.message},
          ${JSON.stringify(event)}::jsonb
        )
        ON CONFLICT (id) DO NOTHING
      `;
    } catch {
      // Postgres history is optional for runtime behavior.
    }
  }
}

export function __resetStorageForTests() {
  memory.workspace = null;
  memory.scene = null;
  memory.timeline = [];
  memory.idempotency.clear();
}

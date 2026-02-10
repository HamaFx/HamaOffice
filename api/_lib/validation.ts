import { z } from 'zod';

const isoDate = z.string().datetime({ offset: true });

const identityProfileSchema = z.object({
  seed: z.string().min(1),
  callsign: z.string().min(3),
  paletteKey: z.string().min(1),
  accentColor: z.string().min(1),
  baseColor: z.string().min(1),
  accessoryColor: z.string().min(1),
  accessory: z.enum(['visor', 'headset', 'antenna', 'badge']),
  gait: z.enum(['steady', 'quick', 'drift']),
  trait: z.enum(['calm', 'focused', 'bold', 'precise']),
});

const agentSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  role: z.enum(['orchestrator', 'planner', 'frontend', 'backend', 'reviewer', 'worker']),
  characterName: z.string().min(1),
  emoji: z.string().min(1),
  avatarSeed: z.string().min(1),
  model: z.string().min(1),
  isDefault: z.boolean(),
  hasBinding: z.boolean(),
  status: z.enum(['online', 'idle', 'offline']),
  lastUpdatedAt: isoDate.nullable(),
  lastSummary: z.string().nullable(),
  lastSessionId: z.string().nullable(),
  totalInputTokens: z.number().nonnegative(),
  totalOutputTokens: z.number().nonnegative(),
  totalTokens: z.number().nonnegative(),
  identity: identityProfileSchema,
});

const taskSchema = z.object({
  task_id: z.string().min(1),
  goal: z.string().min(1),
  priority: z.string().min(1),
  status: z.string().min(1),
  owner: z.string().min(1),
  depends_on: z.array(z.string()),
  attempts: z.number().nonnegative(),
  review_loops: z.number().nonnegative(),
  created_at: isoDate,
  updated_at: isoDate,
  notes: z.array(z.string()),
});

const metricsSchema = z.object({
  total_tasks: z.number().nonnegative(),
  pass_rate: z.number().min(0).max(1),
  status_counts: z.array(
    z.object({
      status: z.string().min(1),
      count: z.number().nonnegative(),
    }),
  ),
  avg_lead_time_ms: z.number().nonnegative(),
  avg_attempts: z.number().nonnegative(),
  avg_review_loops: z.number().nonnegative(),
  total_cost_usd: z.number().nonnegative(),
  avg_cost_usd: z.number().nonnegative(),
  top_failure_causes: z.array(
    z.object({
      cause: z.string().min(1),
      count: z.number().nonnegative(),
    }),
  ),
});

const workspaceSchema = z.object({
  generated_at: isoDate,
  sources: z.object({
    openclaw_config: z.boolean(),
    queue_state: z.boolean(),
    telemetry: z.boolean(),
  }),
  agents: z.array(agentSchema),
  tasks: z.array(taskSchema),
  metrics: metricsSchema,
});

const officeTileSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
});

const officeAgentStateSchema = z.object({
  agentId: z.string().min(1),
  displayName: z.string().min(1),
  role: z.enum(['orchestrator', 'planner', 'frontend', 'backend', 'reviewer', 'worker']),
  runtimeStatus: z.enum(['online', 'idle', 'offline']),
  activityState: z.enum(['offline', 'idle', 'active', 'blocked', 'reviewing']),
  direction: z.enum(['up', 'down', 'left', 'right']),
  tile: officeTileSchema,
  targetTile: officeTileSchema,
  targetZoneId: z.string().min(1),
  currentTaskId: z.string().nullable(),
  lastEventAt: isoDate.nullable(),
  isMoving: z.boolean(),
  identity: identityProfileSchema,
});

const officeZoneSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  capacity: z.number().int().positive(),
  roleHint: z.enum(['orchestrator', 'planner', 'frontend', 'backend', 'reviewer', 'worker']).optional(),
});

const officeAlertSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(['info', 'warning', 'critical']),
  message: z.string().min(1),
  createdAt: isoDate,
  agentId: z.string().optional(),
  taskId: z.string().optional(),
});

export const officeEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'snapshot_ingested',
    'task_blocked',
    'task_passed',
    'task_assigned',
    'task_progress',
    'review_loop_spike',
    'agent_online',
    'agent_offline',
    'system',
  ]),
  severity: z.enum(['info', 'warning', 'critical']),
  message: z.string().min(1),
  createdAt: isoDate,
  agentId: z.string().optional(),
  taskId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const sceneSchema = z.object({
  generated_at: isoDate,
  source: z.enum(['ingest', 'local']),
  sync_status: z.enum(['live', 'stale', 'offline']),
  last_ingested_at: isoDate.nullable(),
  stale_after_ms: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  zones: z.array(officeZoneSchema),
  agents: z.array(officeAgentStateSchema),
  occupancy: z.array(
    z.object({
      zoneId: z.string().min(1),
      count: z.number().int().nonnegative(),
      capacity: z.number().int().positive(),
    }),
  ),
  alerts: z.array(officeAlertSchema),
  events: z.array(officeEventSchema),
  tasks: z.array(taskSchema),
  metrics: metricsSchema,
});

export const ingestSnapshotSchema = z.object({
  generated_at: isoDate,
  workspace: workspaceSchema,
  scene: sceneSchema.optional(),
  source_host: z.string().min(1).max(128).optional(),
});

export const ingestEventSchema = z.object({
  event: officeEventSchema,
});

export function parseTimelineLimit(url: URL): number {
  const raw = url.searchParams.get('limit');
  if (!raw) return 50;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 50;
  return Math.min(parsed, 200);
}

export async function parseJsonBody<T>(request: Request, maxBytes = 1024 * 256): Promise<T> {
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > maxBytes) {
    throw new Error(`Payload exceeds ${maxBytes} bytes`);
  }

  const bodyText = await request.text();
  if (bodyText.length > maxBytes) {
    throw new Error(`Payload exceeds ${maxBytes} bytes`);
  }

  try {
    return JSON.parse(bodyText) as T;
  } catch {
    throw new Error('Request body must be valid JSON');
  }
}

export { z };

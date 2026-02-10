import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createAgentIdentityProfile } from '../../shared/identity.js';
import { OFFICE_GRID_HEIGHT, OFFICE_GRID_WIDTH, OFFICE_ZONES } from '../../shared/officeLayout.js';
import type {
  AgentOfficeIdentity,
  AgentOfficeMetrics,
  AgentOfficeRole,
  AgentOfficeRuntimeStatus,
  AgentOfficeTask,
  AgentOfficeWorkspaceSnapshot,
  OfficeAgentActivityState,
  OfficeAgentState,
  OfficeEvent,
  OfficeSceneSnapshot,
  OfficeZone,
} from '../../shared/types.js';
import { hasReadAccess } from './auth.js';
import { getLatestScene, getLatestWorkspace, setLatestScene, setLatestWorkspace } from './storage.js';

type JsonObject = Record<string, unknown>;

interface OpenClawConfig {
  agents?: {
    list?: OpenClawAgentConfig[];
  };
  bindings?: Array<{
    agentId?: string;
  }>;
}

interface OpenClawAgentConfig {
  id: string;
  name?: string;
  model?: {
    primary?: string;
  };
  default?: boolean;
  identity?: {
    name?: string;
    emoji?: string;
  };
}

interface AgentSessionsFile {
  [key: string]: {
    sessionId?: string;
    updatedAt?: number;
    summary?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

const DEFAULT_METRICS: AgentOfficeMetrics = {
  total_tasks: 0,
  pass_rate: 0,
  status_counts: [],
  avg_lead_time_ms: 0,
  avg_attempts: 0,
  avg_review_loops: 0,
  total_cost_usd: 0,
  avg_cost_usd: 0,
  top_failure_causes: [],
};

const ROLE_TO_CHARACTER: Record<AgentOfficeRole, string> = {
  orchestrator: 'Captain Orbit',
  planner: 'Map Sage',
  frontend: 'Pixel Alchemist',
  backend: 'Forge Warden',
  reviewer: 'Gate Sentinel',
  worker: 'Ops Runner',
};

const ROLE_TO_EMOJI: Record<AgentOfficeRole, string> = {
  orchestrator: '🧭',
  planner: '🧠',
  frontend: '🎨',
  backend: '🛠',
  reviewer: '✅',
  worker: '🤖',
};

const ROLE_ZONE_MAP: Record<AgentOfficeRole, string> = {
  orchestrator: 'orchestrator_desk',
  planner: 'planner_bay',
  frontend: 'frontend_bay',
  backend: 'backend_bay',
  reviewer: 'reviewer_gate',
  worker: 'intake',
};

function parsePositiveNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return value;
}

function expandHome(inputPath: string): string {
  if (inputPath === '~') return os.homedir();
  if (inputPath.startsWith('~/')) return path.join(os.homedir(), inputPath.slice(2));
  return inputPath;
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readJsonLines(filePath: string): Promise<JsonObject[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as JsonObject;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is JsonObject => entry !== null);
  } catch {
    return [];
  }
}

function inferRole(agentId: string): AgentOfficeRole {
  const id = agentId.toLowerCase();
  if (id.includes('orchestrator')) return 'orchestrator';
  if (id.includes('planner')) return 'planner';
  if (id.includes('frontend')) return 'frontend';
  if (id.includes('backend')) return 'backend';
  if (id.includes('reviewer')) return 'reviewer';
  return 'worker';
}

function inferRuntimeStatus(updatedAtMs: number | null): AgentOfficeRuntimeStatus {
  if (!updatedAtMs) return 'offline';
  const ageMs = Date.now() - updatedAtMs;
  if (ageMs < 10 * 60 * 1000) return 'online';
  if (ageMs < 24 * 60 * 60 * 1000) return 'idle';
  return 'offline';
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeTaskStatus(status: string): string {
  return status.trim().toLowerCase();
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function resolveOfficeDirectories() {
  const openclawDir = expandHome(process.env.AGENT_OFFICE_OPENCLAW_DIR || '~/.openclaw');
  const workspaceDir = expandHome(process.env.AGENT_OFFICE_WORKSPACE_DIR || '~/clawd');
  return {
    openclawDir,
    workspaceDir,
    openclawConfigPath: path.join(openclawDir, 'openclaw.json'),
    queueStatePath: path.join(workspaceDir, 'queue', 'tasks-current.json'),
    telemetryPath: path.join(workspaceDir, 'telemetry', 'tasks.jsonl'),
  };
}

async function readAgentSessionSnapshot(
  openclawDir: string,
  agentId: string,
): Promise<{
  lastUpdatedAt: string | null;
  lastSummary: string | null;
  lastSessionId: string | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
}> {
  const sessionsPath = path.join(openclawDir, 'agents', agentId, 'sessions', 'sessions.json');
  const sessions = await readJsonFile<AgentSessionsFile>(sessionsPath);
  if (!sessions) {
    return {
      lastUpdatedAt: null,
      lastSummary: null,
      lastSessionId: null,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
    };
  }

  let latestUpdatedAt: number | null = null;
  let latestSummary: string | null = null;
  let latestSessionId: string | null = null;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalTokens = 0;

  for (const entry of Object.values(sessions)) {
    if (!entry || typeof entry !== 'object') continue;

    const updatedAt = typeof entry.updatedAt === 'number' ? entry.updatedAt : null;
    if (updatedAt && (!latestUpdatedAt || updatedAt > latestUpdatedAt)) {
      latestUpdatedAt = updatedAt;
      latestSummary = typeof entry.summary === 'string' ? entry.summary : null;
      latestSessionId = typeof entry.sessionId === 'string' ? entry.sessionId : null;
    }

    totalInputTokens += parsePositiveNumber(entry.inputTokens);
    totalOutputTokens += parsePositiveNumber(entry.outputTokens);
    totalTokens += parsePositiveNumber(entry.totalTokens);
  }

  return {
    lastUpdatedAt: latestUpdatedAt ? new Date(latestUpdatedAt).toISOString() : null,
    lastSummary: latestSummary,
    lastSessionId: latestSessionId,
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
  };
}

async function loadAgents(openclawDir: string, config: OpenClawConfig | null): Promise<AgentOfficeIdentity[]> {
  const configuredAgents = config?.agents?.list ?? [];
  const bindings = config?.bindings ?? [];

  return Promise.all(
    configuredAgents.map(async (agent) => {
      const role = inferRole(agent.id);
      const snapshot = await readAgentSessionSnapshot(openclawDir, agent.id);
      const lastUpdatedAtMs = snapshot.lastUpdatedAt ? Date.parse(snapshot.lastUpdatedAt) : null;
      const status = inferRuntimeStatus(lastUpdatedAtMs);
      const hasBinding = bindings.some((binding) => binding.agentId === agent.id);
      const displayName = agent.identity?.name || agent.name || agent.id;
      const emoji = agent.identity?.emoji || ROLE_TO_EMOJI[role];
      const identity = createAgentIdentityProfile(agent.id, role, displayName);

      return {
        id: agent.id,
        displayName,
        role,
        characterName: ROLE_TO_CHARACTER[role],
        emoji,
        avatarSeed: agent.id,
        model: agent.model?.primary ?? 'unknown',
        isDefault: Boolean(agent.default),
        hasBinding,
        status,
        lastUpdatedAt: snapshot.lastUpdatedAt,
        lastSummary: snapshot.lastSummary,
        lastSessionId: snapshot.lastSessionId,
        totalInputTokens: snapshot.totalInputTokens,
        totalOutputTokens: snapshot.totalOutputTokens,
        totalTokens: snapshot.totalTokens,
        identity,
      };
    }),
  );
}

async function loadTasks(queueStatePath: string): Promise<AgentOfficeTask[]> {
  const tasks = await readJsonFile<AgentOfficeTask[]>(queueStatePath);
  if (!Array.isArray(tasks)) return [];
  return tasks;
}

async function loadMetrics(telemetryPath: string): Promise<AgentOfficeMetrics> {
  const records = await readJsonLines(telemetryPath);
  if (!records.length) return DEFAULT_METRICS;

  const statusMap = new Map<string, number>();
  const failureMap = new Map<string, number>();

  const leadTimes: number[] = [];
  const attempts: number[] = [];
  const reviewLoops: number[] = [];
  const costs: number[] = [];

  let passed = 0;

  for (const record of records) {
    const status = typeof record.status === 'string' ? record.status : 'unknown';
    statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
    if (status === 'pass') passed += 1;

    const failureCause = typeof record.failure_cause === 'string' ? record.failure_cause.trim() : '';
    if (failureCause) {
      failureMap.set(failureCause, (failureMap.get(failureCause) ?? 0) + 1);
    }

    leadTimes.push(parsePositiveNumber(record.lead_time_ms));
    attempts.push(parsePositiveNumber(record.attempts));
    reviewLoops.push(parsePositiveNumber(record.review_loops));
    costs.push(parsePositiveNumber(record.cost_usd));
  }

  const totalTasks = records.length;
  const totalCost = costs.reduce((sum, value) => sum + value, 0);

  const statusCounts = [...statusMap.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const topFailureCauses = [...failureMap.entries()]
    .map(([cause, count]) => ({ cause, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total_tasks: totalTasks,
    pass_rate: totalTasks === 0 ? 0 : passed / totalTasks,
    status_counts: statusCounts,
    avg_lead_time_ms: average(leadTimes),
    avg_attempts: average(attempts),
    avg_review_loops: average(reviewLoops),
    total_cost_usd: totalCost,
    avg_cost_usd: totalTasks === 0 ? 0 : totalCost / totalTasks,
    top_failure_causes: topFailureCauses,
  };
}

function findZone(id: string): OfficeZone {
  return OFFICE_ZONES.find((zone) => zone.id === id) ?? OFFICE_ZONES[0];
}

function zoneTarget(
  zone: OfficeZone,
  seed: string,
  slot: number,
): {
  x: number;
  y: number;
} {
  const width = Math.max(1, zone.width - 2);
  const height = Math.max(1, zone.height - 2);
  const value = hashSeed(`${seed}:${zone.id}:${slot}`);

  const offsetX = value % width;
  const offsetY = Math.floor(value / width) % height;

  return {
    x: zone.x + 1 + offsetX,
    y: zone.y + 1 + offsetY,
  };
}

function resolveActivityState(agent: AgentOfficeIdentity, task: AgentOfficeTask | null): OfficeAgentActivityState {
  if (agent.status === 'offline') return 'offline';
  if (!task) return 'idle';

  const status = normalizeTaskStatus(task.status);
  if (status.includes('blocked') || status.includes('fail')) return 'blocked';
  if (status.includes('review')) return 'reviewing';
  if (status.includes('progress') || status === 'active' || status === 'running') return 'active';
  if (status === 'done' || status === 'pass') return 'idle';
  return 'active';
}

function findPrimaryTask(agentId: string, tasks: AgentOfficeTask[]): AgentOfficeTask | null {
  const owned = tasks.filter((task) => task.owner === agentId);
  if (!owned.length) return null;

  const ordered = owned.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));

  const blocked = ordered.find((task) => normalizeTaskStatus(task.status).includes('blocked'));
  if (blocked) return blocked;

  const active = ordered.find((task) => {
    const status = normalizeTaskStatus(task.status);
    return status.includes('progress') || status === 'active' || status === 'running';
  });
  if (active) return active;

  const review = ordered.find((task) => normalizeTaskStatus(task.status).includes('review'));
  if (review) return review;

  return ordered[0];
}

function resolveTargetZone(agent: AgentOfficeIdentity, activityState: OfficeAgentActivityState): OfficeZone {
  if (activityState === 'blocked' || activityState === 'reviewing') {
    return findZone('reviewer_gate');
  }
  if (activityState === 'offline') {
    return findZone('break_area');
  }
  if (activityState === 'idle') {
    return agent.role === 'orchestrator' ? findZone('orchestrator_desk') : findZone('break_area');
  }
  return findZone(ROLE_ZONE_MAP[agent.role]);
}

function resolveDirection(agent: AgentOfficeIdentity): 'up' | 'down' | 'left' | 'right' {
  const value = hashSeed(agent.id) % 4;
  if (value === 0) return 'up';
  if (value === 1) return 'down';
  if (value === 2) return 'left';
  return 'right';
}

function collectEvents(workspace: AgentOfficeWorkspaceSnapshot): OfficeEvent[] {
  const now = workspace.generated_at;
  const events: OfficeEvent[] = [];

  for (const task of workspace.tasks.slice(0, 8)) {
    const status = normalizeTaskStatus(task.status);
    if (status.includes('blocked')) {
      events.push({
        id: `ev-${task.task_id}-blocked-${task.updated_at}`,
        type: 'task_blocked',
        severity: 'warning',
        message: `${task.owner} blocked on ${task.goal}`,
        createdAt: task.updated_at,
        taskId: task.task_id,
        agentId: task.owner,
      });
      continue;
    }

    if (status === 'pass' || status === 'done') {
      events.push({
        id: `ev-${task.task_id}-pass-${task.updated_at}`,
        type: 'task_passed',
        severity: 'info',
        message: `${task.owner} completed ${task.goal}`,
        createdAt: task.updated_at,
        taskId: task.task_id,
        agentId: task.owner,
      });
      continue;
    }

    if (task.review_loops >= 3) {
      events.push({
        id: `ev-${task.task_id}-review-${task.updated_at}`,
        type: 'review_loop_spike',
        severity: 'warning',
        message: `${task.owner} is in repeated review loops (${task.review_loops})`,
        createdAt: task.updated_at,
        taskId: task.task_id,
        agentId: task.owner,
      });
      continue;
    }

    if (status.includes('progress')) {
      events.push({
        id: `ev-${task.task_id}-progress-${task.updated_at}`,
        type: 'task_progress',
        severity: 'info',
        message: `${task.owner} is progressing ${task.goal}`,
        createdAt: task.updated_at,
        taskId: task.task_id,
        agentId: task.owner,
      });
    }
  }

  events.push({
    id: `ev-snapshot-${now}`,
    type: 'snapshot_ingested',
    severity: 'info',
    message: `Workspace snapshot refreshed at ${new Date(now).toLocaleTimeString()}`,
    createdAt: now,
  });

  return events.slice(0, 16);
}

function collectAlerts(workspace: AgentOfficeWorkspaceSnapshot) {
  return workspace.tasks
    .filter((task) => normalizeTaskStatus(task.status).includes('blocked') || task.review_loops >= 3)
    .slice(0, 8)
    .map((task) => {
      const blocked = normalizeTaskStatus(task.status).includes('blocked');
      return {
        id: `alert-${task.task_id}`,
        severity: blocked ? 'critical' : 'warning',
        message: blocked
          ? `${task.owner} blocked: ${task.goal}`
          : `${task.owner} high review loops (${task.review_loops})`,
        createdAt: task.updated_at,
        agentId: task.owner,
        taskId: task.task_id,
      } as const;
    });
}

function computeSyncStatus(generatedAt: string): 'live' | 'stale' | 'offline' {
  const age = Date.now() - Date.parse(generatedAt);
  if (age <= 45_000) return 'live';
  if (age <= 5 * 60_000) return 'stale';
  return 'offline';
}

function normalizeWorkspaceSnapshot(workspace: AgentOfficeWorkspaceSnapshot): AgentOfficeWorkspaceSnapshot {
  return {
    ...workspace,
    agents: workspace.agents.map((agent) => ({
      ...agent,
      totalInputTokens: parsePositiveNumber(agent.totalInputTokens),
      totalOutputTokens: parsePositiveNumber(agent.totalOutputTokens),
      totalTokens: parsePositiveNumber(agent.totalTokens),
      identity: agent.identity ?? createAgentIdentityProfile(agent.avatarSeed, agent.role, agent.displayName),
    })),
  };
}

export function buildOfficeSceneFromWorkspace(
  workspace: AgentOfficeWorkspaceSnapshot,
  source: 'ingest' | 'local',
  priorScene?: OfficeSceneSnapshot | null,
): OfficeSceneSnapshot {
  const slot = Math.floor(Date.parse(workspace.generated_at) / 20000);
  const zoneCounts = new Map<string, number>();

  const priorPositions = new Map(priorScene?.agents.map((agent) => [agent.agentId, agent.tile]) ?? []);

  const agents: OfficeAgentState[] = workspace.agents.map((agent) => {
    const task = findPrimaryTask(agent.id, workspace.tasks);
    const activityState = resolveActivityState(agent, task);
    const targetZone = resolveTargetZone(agent, activityState);
    const count = zoneCounts.get(targetZone.id) ?? 0;
    zoneCounts.set(targetZone.id, count + 1);

    const target = zoneTarget(targetZone, agent.id, slot + count);
    const prior = priorPositions.get(agent.id);

    return {
      agentId: agent.id,
      displayName: agent.displayName,
      role: agent.role,
      runtimeStatus: agent.status,
      activityState,
      direction: resolveDirection(agent),
      tile: prior ?? target,
      targetTile: target,
      targetZoneId: targetZone.id,
      currentTaskId: task?.task_id ?? null,
      lastEventAt: task?.updated_at ?? agent.lastUpdatedAt,
      isMoving: !prior || prior.x !== target.x || prior.y !== target.y,
      identity: agent.identity,
    };
  });

  const occupancy = OFFICE_ZONES.map((zone) => ({
    zoneId: zone.id,
    count: agents.filter((agent) => agent.targetZoneId === zone.id).length,
    capacity: zone.capacity,
  }));

  return {
    generated_at: workspace.generated_at,
    source,
    sync_status: computeSyncStatus(workspace.generated_at),
    last_ingested_at: source === 'ingest' ? workspace.generated_at : priorScene?.last_ingested_at ?? null,
    stale_after_ms: 45_000,
    width: OFFICE_GRID_WIDTH,
    height: OFFICE_GRID_HEIGHT,
    zones: OFFICE_ZONES,
    agents,
    occupancy,
    alerts: collectAlerts(workspace),
    events: collectEvents(workspace),
    tasks: workspace.tasks,
    metrics: workspace.metrics,
  };
}

export async function getLocalWorkspaceSnapshot(): Promise<AgentOfficeWorkspaceSnapshot> {
  const dirs = resolveOfficeDirectories();

  const [config, tasks, metrics] = await Promise.all([
    readJsonFile<OpenClawConfig>(dirs.openclawConfigPath),
    loadTasks(dirs.queueStatePath),
    loadMetrics(dirs.telemetryPath),
  ]);

  const agents = await loadAgents(dirs.openclawDir, config);

  return normalizeWorkspaceSnapshot({
    generated_at: new Date().toISOString(),
    sources: {
      openclaw_config: Boolean(config),
      queue_state: tasks.length > 0,
      telemetry: metrics.total_tasks > 0,
    },
    agents,
    tasks,
    metrics,
  });
}

export async function getAgentOfficeWorkspaceSnapshot(): Promise<AgentOfficeWorkspaceSnapshot> {
  const stored = await getLatestWorkspace();
  if (stored) return normalizeWorkspaceSnapshot(stored);

  const local = await getLocalWorkspaceSnapshot();
  await setLatestWorkspace(local);
  return local;
}

export async function getOfficeStateEnvelope(): Promise<{
  workspace: AgentOfficeWorkspaceSnapshot;
  scene: OfficeSceneSnapshot;
}> {
  const [workspace, scene] = await Promise.all([getAgentOfficeWorkspaceSnapshot(), getLatestScene()]);

  if (scene) {
    return { workspace, scene };
  }

  const built = buildOfficeSceneFromWorkspace(workspace, 'local');
  await setLatestScene(built);
  return {
    workspace,
    scene: built,
  };
}

export function hasAgentOfficeAccess(request: Request): boolean {
  return hasReadAccess(request);
}

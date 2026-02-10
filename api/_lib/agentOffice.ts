import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

type JsonObject = Record<string, unknown>;

type AgentRole = 'orchestrator' | 'planner' | 'frontend' | 'backend' | 'reviewer' | 'worker';
type AgentRuntimeStatus = 'online' | 'idle' | 'offline';

interface AgentOfficeIdentity {
  id: string;
  displayName: string;
  role: AgentRole;
  characterName: string;
  emoji: string;
  avatarSeed: string;
  model: string;
  isDefault: boolean;
  hasBinding: boolean;
  status: AgentRuntimeStatus;
  lastUpdatedAt: string | null;
  lastSummary: string | null;
  lastSessionId: string | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
}

interface AgentOfficeTask {
  task_id: string;
  goal: string;
  priority: string;
  status: string;
  owner: string;
  depends_on: string[];
  attempts: number;
  review_loops: number;
  created_at: string;
  updated_at: string;
  notes: string[];
}

interface AgentOfficeStatusCount {
  status: string;
  count: number;
}

interface AgentOfficeFailureCause {
  cause: string;
  count: number;
}

interface AgentOfficeMetrics {
  total_tasks: number;
  pass_rate: number;
  status_counts: AgentOfficeStatusCount[];
  avg_lead_time_ms: number;
  avg_attempts: number;
  avg_review_loops: number;
  total_cost_usd: number;
  avg_cost_usd: number;
  top_failure_causes: AgentOfficeFailureCause[];
}

interface AgentOfficeSources {
  openclaw_config: boolean;
  queue_state: boolean;
  telemetry: boolean;
}

export interface AgentOfficeWorkspaceSnapshot {
  generated_at: string;
  sources: AgentOfficeSources;
  agents: AgentOfficeIdentity[];
  tasks: AgentOfficeTask[];
  metrics: AgentOfficeMetrics;
}

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

const ROLE_TO_CHARACTER: Record<AgentRole, string> = {
  orchestrator: 'Captain Orbit',
  planner: 'Map Sage',
  frontend: 'Pixel Alchemist',
  backend: 'Forge Warden',
  reviewer: 'Gate Sentinel',
  worker: 'Ops Runner',
};

const ROLE_TO_EMOJI: Record<AgentRole, string> = {
  orchestrator: '🧭',
  planner: '🧠',
  frontend: '🎨',
  backend: '🛠',
  reviewer: '✅',
  worker: '🤖',
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

function inferRole(agentId: string): AgentRole {
  const id = agentId.toLowerCase();
  if (id.includes('orchestrator')) return 'orchestrator';
  if (id.includes('planner')) return 'planner';
  if (id.includes('frontend')) return 'frontend';
  if (id.includes('backend')) return 'backend';
  if (id.includes('reviewer')) return 'reviewer';
  return 'worker';
}

function inferRuntimeStatus(updatedAtMs: number | null): AgentRuntimeStatus {
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

export function hasAgentOfficeAccess(request: Request): boolean {
  const token = process.env.AGENT_OFFICE_READ_TOKEN;
  if (!token) return true;
  return request.headers.get('x-agent-office-token') === token;
}

export async function getAgentOfficeWorkspaceSnapshot(): Promise<AgentOfficeWorkspaceSnapshot> {
  const dirs = resolveOfficeDirectories();

  const [config, tasks, metrics] = await Promise.all([
    readJsonFile<OpenClawConfig>(dirs.openclawConfigPath),
    loadTasks(dirs.queueStatePath),
    loadMetrics(dirs.telemetryPath),
  ]);

  const agents = await loadAgents(dirs.openclawDir, config);

  return {
    generated_at: new Date().toISOString(),
    sources: {
      openclaw_config: Boolean(config),
      queue_state: tasks.length > 0,
      telemetry: metrics.total_tasks > 0,
    },
    agents,
    tasks,
    metrics,
  };
}

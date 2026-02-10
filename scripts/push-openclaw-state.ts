import crypto from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { buildOfficeSceneFromWorkspace, getLocalWorkspaceSnapshot } from '../api/_lib/agentOffice.js';
import type { AgentOfficeTask, OfficeEvent } from '../shared/types';

interface CliOptions {
  once: boolean;
  intervalMs: number;
  ingestBaseUrl: string;
  sourceHost: string;
}

interface SnapshotResponse {
  ok?: boolean;
  data?: {
    accepted: boolean;
    duplicate?: boolean;
  };
  error?: string;
}

interface EventResponse {
  ok?: boolean;
  data?: {
    accepted: boolean;
    duplicate?: boolean;
  };
  error?: string;
}

interface TaskState {
  status: string;
  reviewLoops: number;
  owner: string;
  goal: string;
}

function parseArgs(argv: string[]): CliOptions {
  let once = false;
  let intervalMs = Number.parseInt(process.env.AGENT_OFFICE_PUSH_INTERVAL_MS ?? '15000', 10);
  let ingestBaseUrl = process.env.AGENT_OFFICE_INGEST_URL ?? 'http://localhost:3000/api/ingest';
  const sourceHost = process.env.AGENT_OFFICE_SOURCE_HOST ?? process.env.HOSTNAME ?? 'local-openclaw';

  for (const arg of argv) {
    if (arg === '--once') once = true;
    if (arg === '--watch') once = false;
    if (arg.startsWith('--interval=')) {
      const raw = Number.parseInt(arg.split('=')[1] ?? '', 10);
      if (Number.isFinite(raw) && raw > 0) intervalMs = raw;
    }
    if (arg.startsWith('--url=')) {
      const raw = arg.split('=')[1] ?? '';
      if (raw) ingestBaseUrl = raw;
    }
  }

  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    intervalMs = 15_000;
  }

  ingestBaseUrl = ingestBaseUrl.replace(/\/+$/, '');

  return {
    once,
    intervalMs,
    ingestBaseUrl,
    sourceHost,
  };
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  const ingestToken = process.env.AGENT_OFFICE_INGEST_TOKEN;
  if (ingestToken) {
    headers['x-agent-office-ingest-token'] = ingestToken;
  }

  return headers;
}

async function withRetry<T>(run: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown;

  for (let index = 0; index < attempts; index += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (index < attempts - 1) {
        await delay((index + 1) * 750);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown retry error');
}

function deriveEvents(currentTasks: AgentOfficeTask[], previousTaskState: Map<string, TaskState>): OfficeEvent[] {
  const events: OfficeEvent[] = [];
  const now = new Date().toISOString();

  for (const task of currentTasks) {
    const prior = previousTaskState.get(task.task_id);
    const status = task.status.trim().toLowerCase();

    if (!prior) {
      events.push({
        id: `event-${task.task_id}-assigned-${task.updated_at}`,
        type: 'task_assigned',
        severity: 'info',
        message: `${task.owner} picked up ${task.goal}`,
        createdAt: task.updated_at,
        agentId: task.owner,
        taskId: task.task_id,
      });
      continue;
    }

    const prevStatus = prior.status.trim().toLowerCase();

    if (status !== prevStatus) {
      if (status.includes('blocked')) {
        events.push({
          id: `event-${task.task_id}-blocked-${task.updated_at}`,
          type: 'task_blocked',
          severity: 'warning',
          message: `${task.owner} blocked on ${task.goal}`,
          createdAt: task.updated_at,
          agentId: task.owner,
          taskId: task.task_id,
        });
      } else if (status === 'done' || status === 'pass') {
        events.push({
          id: `event-${task.task_id}-pass-${task.updated_at}`,
          type: 'task_passed',
          severity: 'info',
          message: `${task.owner} completed ${task.goal}`,
          createdAt: task.updated_at,
          agentId: task.owner,
          taskId: task.task_id,
        });
      } else {
        events.push({
          id: `event-${task.task_id}-progress-${task.updated_at}`,
          type: 'task_progress',
          severity: 'info',
          message: `${task.owner} status changed to ${status}`,
          createdAt: task.updated_at,
          agentId: task.owner,
          taskId: task.task_id,
          metadata: {
            previousStatus: prevStatus,
            nextStatus: status,
          },
        });
      }
    }

    if (task.review_loops >= 3 && task.review_loops > prior.reviewLoops) {
      events.push({
        id: `event-${task.task_id}-review-${task.updated_at}`,
        type: 'review_loop_spike',
        severity: 'warning',
        message: `${task.owner} review loops increased to ${task.review_loops}`,
        createdAt: task.updated_at,
        agentId: task.owner,
        taskId: task.task_id,
      });
    }
  }

  events.push({
    id: `event-heartbeat-${now}`,
    type: 'system',
    severity: 'info',
    message: 'OpenClaw sync heartbeat',
    createdAt: now,
  });

  return events.slice(0, 40);
}

function updateTaskState(currentTasks: AgentOfficeTask[]): Map<string, TaskState> {
  const map = new Map<string, TaskState>();
  for (const task of currentTasks) {
    map.set(task.task_id, {
      status: task.status,
      reviewLoops: task.review_loops,
      owner: task.owner,
      goal: task.goal,
    });
  }
  return map;
}

async function pushSnapshot(baseUrl: string, payload: unknown): Promise<SnapshotResponse> {
  const response = await fetch(`${baseUrl}/snapshot`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'x-idempotency-key': `snapshot-${crypto.randomUUID()}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as SnapshotResponse;
  if (!response.ok) {
    throw new Error(`Snapshot ingest failed (${response.status}): ${data.error ?? 'unknown error'}`);
  }

  return data;
}

async function pushEvent(baseUrl: string, event: OfficeEvent): Promise<EventResponse> {
  const response = await fetch(`${baseUrl}/event`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'x-idempotency-key': `event-${event.id}`,
    },
    body: JSON.stringify({ event }),
  });

  const data = (await response.json()) as EventResponse;
  if (!response.ok) {
    throw new Error(`Event ingest failed (${response.status}): ${data.error ?? 'unknown error'}`);
  }

  return data;
}

async function runSync(options: CliOptions, previousTaskState: Map<string, TaskState>) {
  const workspace = await getLocalWorkspaceSnapshot();
  const scene = buildOfficeSceneFromWorkspace(workspace, 'ingest');

  const snapshotPayload = {
    generated_at: workspace.generated_at,
    workspace,
    scene,
    source_host: options.sourceHost,
  };

  await withRetry(() => pushSnapshot(options.ingestBaseUrl, snapshotPayload));

  const events = deriveEvents(workspace.tasks, previousTaskState);
  for (const event of events) {
    await withRetry(() => pushEvent(options.ingestBaseUrl, event), 3);
  }

  const nextState = updateTaskState(workspace.tasks);
  const blocked = workspace.tasks.filter((task) => task.status.toLowerCase().includes('blocked')).length;

  process.stdout.write(
    `[sync] ${workspace.generated_at} agents=${workspace.agents.length} tasks=${workspace.tasks.length} blocked=${blocked} events=${events.length}\n`,
  );

  return nextState;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  process.stdout.write(
    `[sync] start mode=${options.once ? 'once' : 'watch'} interval=${options.intervalMs}ms target=${options.ingestBaseUrl}\n`,
  );

  let taskState = new Map<string, TaskState>();

  do {
    try {
      taskState = await runSync(options, taskState);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      process.stderr.write(`[sync] error ${message}\n`);
    }

    if (options.once) break;
    await delay(options.intervalMs);
  } while (true);
}

void main();

import type {
  AgentOfficeIdentity,
  AgentOfficeMetrics,
  AgentOfficeTask,
  AgentOfficeWorkspaceSnapshot,
  OfficeEvent,
  OfficeStateEnvelope,
} from '../types';

type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
};

function buildHeaders(): Headers {
  const headers = new Headers({
    'content-type': 'application/json',
  });

  const officeToken = import.meta.env.VITE_AGENT_OFFICE_TOKEN as string | undefined;
  if (officeToken) {
    headers.set('x-agent-office-token', officeToken);
  }

  return headers;
}

async function requestOffice<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    method: 'GET',
    headers: buildHeaders(),
    credentials: 'include',
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorMessage = payload?.error || `Agent Office request failed (${response.status})`;
    throw new Error(errorMessage);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }

  return payload as T;
}

export async function fetchAgentOfficeWorkspace(): Promise<AgentOfficeWorkspaceSnapshot> {
  return requestOffice<AgentOfficeWorkspaceSnapshot>('/api/workspace');
}

export async function fetchAgentOfficeAgents(): Promise<AgentOfficeIdentity[]> {
  return requestOffice<AgentOfficeIdentity[]>('/api/agents');
}

export async function fetchAgentOfficeTasks(): Promise<AgentOfficeTask[]> {
  return requestOffice<AgentOfficeTask[]>('/api/tasks');
}

export async function fetchAgentOfficeMetrics(): Promise<AgentOfficeMetrics> {
  return requestOffice<AgentOfficeMetrics>('/api/metrics');
}

export async function fetchOfficeState(): Promise<OfficeStateEnvelope> {
  return requestOffice<OfficeStateEnvelope>('/api/office/state');
}

export async function fetchOfficeTimeline(limit = 80): Promise<{ events: OfficeEvent[]; count: number; limit: number }> {
  return requestOffice<{ events: OfficeEvent[]; count: number; limit: number }>(`/api/office/timeline?limit=${limit}`);
}

import type { AgentOfficeTask, OfficeAgentActivityState, OfficeAgentState } from '../../types';

function normalize(status: string): string {
  return status.trim().toLowerCase();
}

export function deriveActivityState(runtimeStatus: OfficeAgentState['runtimeStatus'], task: AgentOfficeTask | null): OfficeAgentActivityState {
  if (runtimeStatus === 'offline') return 'offline';
  if (!task) return 'idle';

  const status = normalize(task.status);
  if (status.includes('blocked') || status.includes('fail')) return 'blocked';
  if (status.includes('review')) return 'reviewing';
  if (status.includes('progress') || status === 'running' || status === 'active') return 'active';
  return 'idle';
}

export function pickTaskForAgent(agentId: string, tasks: AgentOfficeTask[]): AgentOfficeTask | null {
  const owned = tasks
    .filter((task) => task.owner === agentId)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));

  if (!owned.length) return null;

  const blocked = owned.find((task) => normalize(task.status).includes('blocked'));
  if (blocked) return blocked;

  const active = owned.find((task) => {
    const status = normalize(task.status);
    return status.includes('progress') || status === 'active' || status === 'running';
  });
  if (active) return active;

  const review = owned.find((task) => normalize(task.status).includes('review'));
  if (review) return review;

  return owned[0];
}

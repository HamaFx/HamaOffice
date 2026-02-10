import { describe, expect, it } from 'vitest';
import { deriveActivityState, pickTaskForAgent } from './stateMachine';

const baseTask = {
  task_id: 'task-1',
  goal: 'implement panel',
  priority: 'high',
  owner: 'agent-1',
  depends_on: [],
  attempts: 1,
  review_loops: 0,
  created_at: '2026-02-10T00:00:00.000Z',
  updated_at: '2026-02-10T00:00:00.000Z',
  notes: [],
};

describe('state machine', () => {
  it('derives blocked state from task status', () => {
    const state = deriveActivityState('online', {
      ...baseTask,
      status: 'blocked',
    });

    expect(state).toBe('blocked');
  });

  it('derives offline when runtime is offline', () => {
    const state = deriveActivityState('offline', {
      ...baseTask,
      status: 'in_progress',
    });

    expect(state).toBe('offline');
  });

  it('prioritizes blocked task selection', () => {
    const selected = pickTaskForAgent('agent-1', [
      {
        ...baseTask,
        task_id: 'task-2',
        status: 'in_progress',
      },
      {
        ...baseTask,
        task_id: 'task-3',
        status: 'blocked',
      },
    ]);

    expect(selected?.task_id).toBe('task-3');
  });
});

import { describe, expect, it } from 'vitest';
import type { OfficeSceneSnapshot } from '../../types';
import { createSimulationState, selectRenderedAgents, stepSimulation } from './engine';

const baseScene: OfficeSceneSnapshot = {
  generated_at: '2026-02-10T00:00:00.000Z',
  source: 'ingest',
  sync_status: 'live',
  last_ingested_at: '2026-02-10T00:00:00.000Z',
  stale_after_ms: 45_000,
  width: 48,
  height: 30,
  zones: [],
  occupancy: [],
  alerts: [],
  events: [],
  tasks: [],
  metrics: {
    total_tasks: 0,
    pass_rate: 0,
    status_counts: [],
    avg_lead_time_ms: 0,
    avg_attempts: 0,
    avg_review_loops: 0,
    total_cost_usd: 0,
    avg_cost_usd: 0,
    top_failure_causes: [],
  },
  agents: [
    {
      agentId: 'agent-a',
      displayName: 'Agent A',
      role: 'worker',
      runtimeStatus: 'online',
      activityState: 'active',
      direction: 'right',
      tile: { x: 5, y: 5 },
      targetTile: { x: 6, y: 5 },
      targetZoneId: 'intake',
      currentTaskId: 'task-1',
      lastEventAt: '2026-02-10T00:00:00.000Z',
      isMoving: true,
      identity: {
        seed: 'agent-a',
        callsign: 'AGE-111',
        paletteKey: 'a',
        accentColor: '#fff',
        baseColor: '#aaa',
        accessoryColor: '#222',
        accessory: 'badge',
        gait: 'quick',
        trait: 'focused',
      },
    },
    {
      agentId: 'agent-b',
      displayName: 'Agent B',
      role: 'worker',
      runtimeStatus: 'online',
      activityState: 'active',
      direction: 'left',
      tile: { x: 7, y: 5 },
      targetTile: { x: 6, y: 5 },
      targetZoneId: 'intake',
      currentTaskId: 'task-2',
      lastEventAt: '2026-02-10T00:00:00.000Z',
      isMoving: true,
      identity: {
        seed: 'agent-b',
        callsign: 'AGE-222',
        paletteKey: 'b',
        accentColor: '#fff',
        baseColor: '#aaa',
        accessoryColor: '#222',
        accessory: 'badge',
        gait: 'quick',
        trait: 'focused',
      },
    },
  ],
};

describe('simulation engine', () => {
  it('advances agents toward their targets', () => {
    const initial = createSimulationState(baseScene, null);
    const next = stepSimulation(initial, 1000);
    const agents = selectRenderedAgents(next);

    const a = agents.find((agent) => agent.agentId === 'agent-a');
    const b = agents.find((agent) => agent.agentId === 'agent-b');

    expect(a).toBeTruthy();
    expect(b).toBeTruthy();

    expect(a?.tile.x).toBeGreaterThanOrEqual(5);
    expect(b?.tile.x).toBeLessThanOrEqual(7);
  });

  it('avoids hard overlap on contested destination', () => {
    const initial = createSimulationState(baseScene, null);
    const stepA = stepSimulation(initial, 1000);
    const agents = selectRenderedAgents(stepA);

    const positions = agents.map((agent) => `${agent.tile.x},${agent.tile.y}`);
    expect(new Set(positions).size).toBe(positions.length);
  });
});

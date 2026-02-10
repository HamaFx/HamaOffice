import { describe, expect, it } from 'vitest';
import { buildAgentIdentity, buildAgentSprite } from './profile';

describe('identity profile', () => {
  it('is deterministic for same seed and role', () => {
    const a = buildAgentIdentity('agent-1', 'planner', 'Planner One');
    const b = buildAgentIdentity('agent-1', 'planner', 'Planner One');

    expect(a).toEqual(b);
    expect(a.callsign).toMatch(/^PLA-\d{3}$/);
  });

  it('changes for different seeds', () => {
    const a = buildAgentIdentity('agent-1', 'planner', 'Planner One');
    const b = buildAgentIdentity('agent-2', 'planner', 'Planner Two');

    expect(a.callsign).not.toEqual(b.callsign);
  });

  it('builds deterministic sprite matrix', () => {
    const profile = buildAgentIdentity('agent-9', 'backend', 'Backend Nine');
    const spriteA = buildAgentSprite(profile, 2);
    const spriteB = buildAgentSprite(profile, 2);

    expect(spriteA).toEqual(spriteB);
    expect(spriteA.width).toBe(16);
    expect(spriteA.height).toBe(16);
    expect(spriteA.pixels).toHaveLength(256);
  });
});

import type {
  OfficeAgentState,
  OfficeDirection,
  OfficeSceneSnapshot,
  OfficeTilePoint,
} from '../../types';
import { createDefaultGrid, distance, findPath, tileKey } from './grid';

export interface SimulatedOfficeAgent extends OfficeAgentState {
  position: {
    x: number;
    y: number;
  };
  frame: number;
  speed: number;
}

interface InternalAgent extends SimulatedOfficeAgent {
  path: OfficeTilePoint[];
}

export interface OfficeSimulationState {
  width: number;
  height: number;
  agents: Map<string, InternalAgent>;
  generatedAt: string;
}

function speedFromGait(gait: OfficeAgentState['identity']['gait']): number {
  if (gait === 'quick') return 4.2;
  if (gait === 'drift') return 2.3;
  return 3.1;
}

function sameTile(a: OfficeTilePoint, b: OfficeTilePoint): boolean {
  return a.x === b.x && a.y === b.y;
}

function roundTile(position: { x: number; y: number }): OfficeTilePoint {
  return {
    x: Math.round(position.x),
    y: Math.round(position.y),
  };
}

function directionFromDelta(dx: number, dy: number, fallback: OfficeDirection): OfficeDirection {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }
  if (Math.abs(dy) > 0) {
    return dy >= 0 ? 'down' : 'up';
  }
  return fallback;
}

function buildPath(current: OfficeTilePoint, target: OfficeTilePoint): OfficeTilePoint[] {
  const grid = createDefaultGrid();
  const raw = findPath(current, target, grid);
  if (raw.length > 1 && sameTile(raw[0], current)) {
    return raw.slice(1);
  }
  return raw;
}

export function createSimulationState(
  snapshot: OfficeSceneSnapshot,
  previous: OfficeSimulationState | null,
): OfficeSimulationState {
  const agents = new Map<string, InternalAgent>();

  for (const agent of snapshot.agents) {
    const existing = previous?.agents.get(agent.agentId);
    const startTile = existing?.tile ?? agent.tile;
    const startPosition = existing?.position ?? { x: startTile.x, y: startTile.y };

    const currentRounded = roundTile(startPosition);
    const path = buildPath(currentRounded, agent.targetTile);

    agents.set(agent.agentId, {
      ...agent,
      position: startPosition,
      frame: existing?.frame ?? 0,
      speed: speedFromGait(agent.identity.gait),
      direction: existing?.direction ?? agent.direction,
      isMoving: path.length > 0 && !sameTile(currentRounded, agent.targetTile),
      path,
    });
  }

  return {
    width: snapshot.width,
    height: snapshot.height,
    agents,
    generatedAt: snapshot.generated_at,
  };
}

export function stepSimulation(state: OfficeSimulationState, deltaMs: number): OfficeSimulationState {
  const stepDistance = Math.max(0, deltaMs) / 1000;
  const nextAgents = new Map<string, InternalAgent>();
  const occupied = new Set<string>();

  for (const agent of state.agents.values()) {
    occupied.add(tileKey(roundTile(agent.position)));
  }

  const ordered = [...state.agents.values()].sort((a, b) => a.agentId.localeCompare(b.agentId));

  for (const agent of ordered) {
    const next: InternalAgent = {
      ...agent,
      position: { ...agent.position },
      tile: { ...agent.tile },
      path: [...agent.path],
      frame: agent.frame,
    };

    const currentTile = roundTile(next.position);
    if (next.path.length === 0 && !sameTile(currentTile, next.targetTile)) {
      next.path = buildPath(currentTile, next.targetTile);
    }

    const waypoint = next.path[0];
    if (!waypoint) {
      next.tile = currentTile;
      next.isMoving = false;
      nextAgents.set(next.agentId, next);
      continue;
    }

    if (sameTile(currentTile, waypoint)) {
      next.path.shift();
    }

    const target = next.path[0];
    if (!target) {
      next.tile = currentTile;
      next.isMoving = false;
      nextAgents.set(next.agentId, next);
      continue;
    }

    const targetKey = tileKey(target);
    const currentKey = tileKey(currentTile);

    if (targetKey !== currentKey && occupied.has(targetKey)) {
      next.tile = currentTile;
      next.isMoving = false;
      nextAgents.set(next.agentId, next);
      continue;
    }

    const dx = target.x - next.position.x;
    const dy = target.y - next.position.y;
    const dist = Math.hypot(dx, dy);
    const maxStep = next.speed * stepDistance;

    if (dist <= maxStep || dist <= 0.0001) {
      next.position.x = target.x;
      next.position.y = target.y;
      next.tile = { ...target };
      next.path.shift();
    } else {
      const ratio = maxStep / dist;
      next.position.x += dx * ratio;
      next.position.y += dy * ratio;
      next.tile = roundTile(next.position);
    }

    next.direction = directionFromDelta(dx, dy, next.direction);
    next.isMoving = distance(next.tile, next.targetTile) > 0.05;

    if (next.isMoving) {
      next.frame = (next.frame + stepDistance * 10) % 4;
    }

    occupied.delete(currentKey);
    occupied.add(tileKey(roundTile(next.position)));

    nextAgents.set(next.agentId, next);
  }

  return {
    ...state,
    agents: nextAgents,
  };
}

export function selectRenderedAgents(state: OfficeSimulationState): SimulatedOfficeAgent[] {
  return [...state.agents.values()]
    .map((agent) => ({
      ...agent,
      tile: roundTile(agent.position),
    }))
    .sort((a, b) => a.agentId.localeCompare(b.agentId));
}

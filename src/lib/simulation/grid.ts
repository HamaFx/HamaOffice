import type { OfficeTilePoint, OfficeZone } from '../../types';
import { OFFICE_GRID_HEIGHT, OFFICE_GRID_WIDTH, OFFICE_OBSTACLES } from '../../../shared/officeLayout';

export interface GridConfig {
  width: number;
  height: number;
  blocked: Set<string>;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function parseKey(value: string): OfficeTilePoint {
  const [rawX, rawY] = value.split(',');
  return {
    x: Number.parseInt(rawX, 10),
    y: Number.parseInt(rawY, 10),
  };
}

export function tileKey(tile: OfficeTilePoint): string {
  return key(tile.x, tile.y);
}

export function createDefaultGrid(): GridConfig {
  const blocked = new Set<string>();

  for (const obstacle of OFFICE_OBSTACLES) {
    for (let y = obstacle.y; y < obstacle.y + obstacle.height; y += 1) {
      for (let x = obstacle.x; x < obstacle.x + obstacle.width; x += 1) {
        blocked.add(key(x, y));
      }
    }
  }

  return {
    width: OFFICE_GRID_WIDTH,
    height: OFFICE_GRID_HEIGHT,
    blocked,
  };
}

export function zoneInteriorTiles(zone: OfficeZone): OfficeTilePoint[] {
  const tiles: OfficeTilePoint[] = [];

  const startX = zone.x + 1;
  const startY = zone.y + 1;
  const endX = zone.x + zone.width - 2;
  const endY = zone.y + zone.height - 2;

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      tiles.push({ x, y });
    }
  }

  return tiles;
}

function inBounds(tile: OfficeTilePoint, grid: GridConfig): boolean {
  return tile.x >= 0 && tile.y >= 0 && tile.x < grid.width && tile.y < grid.height;
}

function neighbors(tile: OfficeTilePoint): OfficeTilePoint[] {
  return [
    { x: tile.x + 1, y: tile.y },
    { x: tile.x - 1, y: tile.y },
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x, y: tile.y - 1 },
  ];
}

export function findPath(start: OfficeTilePoint, goal: OfficeTilePoint, grid: GridConfig): OfficeTilePoint[] {
  if (start.x === goal.x && start.y === goal.y) return [start];

  const startKey = key(start.x, start.y);
  const goalKey = key(goal.x, goal.y);

  const queue: string[] = [startKey];
  const parent = new Map<string, string | null>();
  parent.set(startKey, null);

  while (queue.length > 0) {
    const currentKey = queue.shift();
    if (!currentKey) break;
    if (currentKey === goalKey) break;

    const current = parseKey(currentKey);
    const adjacent = neighbors(current);

    for (const next of adjacent) {
      const nextKey = key(next.x, next.y);
      if (!inBounds(next, grid)) continue;
      if (grid.blocked.has(nextKey) && nextKey !== goalKey) continue;
      if (parent.has(nextKey)) continue;

      parent.set(nextKey, currentKey);
      queue.push(nextKey);
    }
  }

  if (!parent.has(goalKey)) {
    return [start];
  }

  const path: OfficeTilePoint[] = [];
  let cursor: string | null = goalKey;

  while (cursor) {
    path.push(parseKey(cursor));
    cursor = parent.get(cursor) ?? null;
  }

  path.reverse();
  return path;
}

export function distance(a: OfficeTilePoint, b: OfficeTilePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

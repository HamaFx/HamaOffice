import { describe, expect, it } from 'vitest';
import { createDefaultGrid, findPath } from './grid';

describe('grid pathfinding', () => {
  it('finds path between two reachable tiles', () => {
    const grid = createDefaultGrid();
    const path = findPath({ x: 1, y: 1 }, { x: 6, y: 6 }, grid);

    expect(path.length).toBeGreaterThan(1);
    expect(path.at(0)).toEqual({ x: 1, y: 1 });
    expect(path.at(-1)).toEqual({ x: 6, y: 6 });
  });

  it('returns start tile when already at goal', () => {
    const grid = createDefaultGrid();
    const path = findPath({ x: 5, y: 5 }, { x: 5, y: 5 }, grid);

    expect(path).toEqual([{ x: 5, y: 5 }]);
  });
});

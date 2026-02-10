import type { OfficeZone } from './types';

export const OFFICE_GRID_WIDTH = 48;
export const OFFICE_GRID_HEIGHT = 30;
export const OFFICE_TILE_SIZE = 18;

export const OFFICE_ZONES: OfficeZone[] = [
  { id: 'intake', label: 'Intake', x: 2, y: 3, width: 10, height: 8, capacity: 6 },
  { id: 'planner_bay', label: 'Planner Bay', x: 14, y: 3, width: 8, height: 8, capacity: 4, roleHint: 'planner' },
  { id: 'frontend_bay', label: 'Frontend Bay', x: 24, y: 3, width: 8, height: 8, capacity: 4, roleHint: 'frontend' },
  { id: 'backend_bay', label: 'Backend Bay', x: 34, y: 3, width: 10, height: 8, capacity: 6, roleHint: 'backend' },
  { id: 'reviewer_gate', label: 'Reviewer Gate', x: 14, y: 14, width: 14, height: 8, capacity: 8, roleHint: 'reviewer' },
  { id: 'break_area', label: 'Break Area', x: 30, y: 14, width: 14, height: 12, capacity: 12 },
  { id: 'orchestrator_desk', label: 'Control Desk', x: 2, y: 14, width: 10, height: 12, capacity: 4, roleHint: 'orchestrator' },
];

export interface OfficeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const OFFICE_OBSTACLES: OfficeRect[] = [
  { x: 12, y: 3, width: 1, height: 23 },
  { x: 22, y: 3, width: 1, height: 8 },
  { x: 32, y: 3, width: 1, height: 8 },
  { x: 2, y: 11, width: 42, height: 1 },
  { x: 27, y: 14, width: 1, height: 12 },
  { x: 8, y: 18, width: 4, height: 1 },
  { x: 18, y: 18, width: 6, height: 1 },
  { x: 37, y: 20, width: 5, height: 1 },
];

export function isInsideZone(zone: OfficeZone, x: number, y: number): boolean {
  return x >= zone.x && y >= zone.y && x < zone.x + zone.width && y < zone.y + zone.height;
}

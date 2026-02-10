export type OfficePropKind =
  | 'desk'
  | 'terminal'
  | 'server'
  | 'plant'
  | 'coffee'
  | 'gate-beacon'
  | 'table'
  | 'crate';

export interface OfficeProp {
  id: string;
  kind: OfficePropKind;
  x: number;
  y: number;
  width: number;
  height: number;
  zoneId?: string;
}

export const OFFICE_PROPS: OfficeProp[] = [
  { id: 'intake-desk-a', kind: 'desk', x: 4, y: 5, width: 3, height: 2, zoneId: 'intake' },
  { id: 'intake-desk-b', kind: 'desk', x: 8, y: 7, width: 3, height: 2, zoneId: 'intake' },
  { id: 'planner-terminal-a', kind: 'terminal', x: 16, y: 5, width: 2, height: 2, zoneId: 'planner_bay' },
  { id: 'planner-terminal-b', kind: 'terminal', x: 19, y: 8, width: 2, height: 2, zoneId: 'planner_bay' },
  { id: 'frontend-terminal-a', kind: 'terminal', x: 25, y: 5, width: 2, height: 2, zoneId: 'frontend_bay' },
  { id: 'frontend-terminal-b', kind: 'terminal', x: 29, y: 8, width: 2, height: 2, zoneId: 'frontend_bay' },
  { id: 'backend-rack-a', kind: 'server', x: 36, y: 5, width: 2, height: 3, zoneId: 'backend_bay' },
  { id: 'backend-rack-b', kind: 'server', x: 40, y: 7, width: 2, height: 3, zoneId: 'backend_bay' },
  { id: 'review-gate-beacon', kind: 'gate-beacon', x: 26, y: 13, width: 1, height: 1, zoneId: 'reviewer_gate' },
  { id: 'review-table', kind: 'table', x: 18, y: 18, width: 4, height: 2, zoneId: 'reviewer_gate' },
  { id: 'break-coffee', kind: 'coffee', x: 32, y: 18, width: 2, height: 2, zoneId: 'break_area' },
  { id: 'break-plant-a', kind: 'plant', x: 41, y: 16, width: 1, height: 2, zoneId: 'break_area' },
  { id: 'break-plant-b', kind: 'plant', x: 39, y: 23, width: 1, height: 2, zoneId: 'break_area' },
  { id: 'orchestrator-main-desk', kind: 'desk', x: 4, y: 17, width: 5, height: 2, zoneId: 'orchestrator_desk' },
  { id: 'orchestrator-crate', kind: 'crate', x: 9, y: 22, width: 2, height: 2, zoneId: 'orchestrator_desk' },
];

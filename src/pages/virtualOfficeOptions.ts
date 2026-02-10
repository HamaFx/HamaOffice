import type { AgentOfficeRole, AgentOfficeRuntimeStatus, OfficeTheme } from '../types';

export const roleOptions: Array<{ value: 'all' | AgentOfficeRole; label: string }> = [
  { value: 'all', label: 'All Roles' },
  { value: 'orchestrator', label: 'Orchestrator' },
  { value: 'planner', label: 'Planner' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'worker', label: 'Worker' },
];

export const statusOptions: Array<{ value: 'all' | AgentOfficeRuntimeStatus; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'online', label: 'Online' },
  { value: 'idle', label: 'Idle' },
  { value: 'offline', label: 'Offline' },
];

export const densityOptions = [
  { value: 'cozy', label: 'Cozy' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'dense', label: 'Dense' },
] as const;

export type OfficeDensity = (typeof densityOptions)[number]['value'];

export const themeOptions: Array<{ value: OfficeTheme; label: string }> = [
  { value: 'night', label: 'Night Shift' },
  { value: 'day', label: 'Day Shift' },
  { value: 'neon', label: 'Neon Ops' },
];

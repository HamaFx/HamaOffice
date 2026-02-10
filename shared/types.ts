export type AgentOfficeRole = 'orchestrator' | 'planner' | 'frontend' | 'backend' | 'reviewer' | 'worker';
export type AgentOfficeRuntimeStatus = 'online' | 'idle' | 'offline';

export type OfficeAgentActivityState = 'offline' | 'idle' | 'active' | 'blocked' | 'reviewing';
export type OfficeDirection = 'up' | 'down' | 'left' | 'right';
export type OfficeAlertSeverity = 'info' | 'warning' | 'critical';
export type OfficeSyncStatus = 'live' | 'stale' | 'offline';

export interface AgentIdentityProfile {
  seed: string;
  callsign: string;
  paletteKey: string;
  accentColor: string;
  baseColor: string;
  accessoryColor: string;
  accessory: 'visor' | 'headset' | 'antenna' | 'badge';
  gait: 'steady' | 'quick' | 'drift';
  trait: 'calm' | 'focused' | 'bold' | 'precise';
}

export interface AgentOfficeIdentity {
  id: string;
  displayName: string;
  role: AgentOfficeRole;
  characterName: string;
  emoji: string;
  avatarSeed: string;
  model: string;
  isDefault: boolean;
  hasBinding: boolean;
  status: AgentOfficeRuntimeStatus;
  lastUpdatedAt: string | null;
  lastSummary: string | null;
  lastSessionId: string | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  identity: AgentIdentityProfile;
}

export interface AgentOfficeTask {
  task_id: string;
  goal: string;
  priority: string;
  status: string;
  owner: string;
  depends_on: string[];
  attempts: number;
  review_loops: number;
  created_at: string;
  updated_at: string;
  notes: string[];
}

export interface AgentOfficeStatusCount {
  status: string;
  count: number;
}

export interface AgentOfficeFailureCause {
  cause: string;
  count: number;
}

export interface AgentOfficeMetrics {
  total_tasks: number;
  pass_rate: number;
  status_counts: AgentOfficeStatusCount[];
  avg_lead_time_ms: number;
  avg_attempts: number;
  avg_review_loops: number;
  total_cost_usd: number;
  avg_cost_usd: number;
  top_failure_causes: AgentOfficeFailureCause[];
}

export interface AgentOfficeSources {
  openclaw_config: boolean;
  queue_state: boolean;
  telemetry: boolean;
}

export interface AgentOfficeWorkspaceSnapshot {
  generated_at: string;
  sources: AgentOfficeSources;
  agents: AgentOfficeIdentity[];
  tasks: AgentOfficeTask[];
  metrics: AgentOfficeMetrics;
}

export interface OfficeTilePoint {
  x: number;
  y: number;
}

export interface OfficeZone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  roleHint?: AgentOfficeRole;
}

export interface OfficeAgentState {
  agentId: string;
  displayName: string;
  role: AgentOfficeRole;
  runtimeStatus: AgentOfficeRuntimeStatus;
  activityState: OfficeAgentActivityState;
  direction: OfficeDirection;
  tile: OfficeTilePoint;
  targetTile: OfficeTilePoint;
  targetZoneId: string;
  currentTaskId: string | null;
  lastEventAt: string | null;
  isMoving: boolean;
  identity: AgentIdentityProfile;
}

export interface OfficeAlert {
  id: string;
  severity: OfficeAlertSeverity;
  message: string;
  createdAt: string;
  agentId?: string;
  taskId?: string;
}

export interface OfficeEvent {
  id: string;
  type:
    | 'snapshot_ingested'
    | 'task_blocked'
    | 'task_passed'
    | 'task_assigned'
    | 'task_progress'
    | 'review_loop_spike'
    | 'agent_online'
    | 'agent_offline'
    | 'system';
  severity: OfficeAlertSeverity;
  message: string;
  createdAt: string;
  agentId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}

export interface OfficeZoneOccupancy {
  zoneId: string;
  count: number;
  capacity: number;
}

export interface OfficeSceneSnapshot {
  generated_at: string;
  source: 'ingest' | 'local';
  sync_status: OfficeSyncStatus;
  last_ingested_at: string | null;
  stale_after_ms: number;
  width: number;
  height: number;
  zones: OfficeZone[];
  agents: OfficeAgentState[];
  occupancy: OfficeZoneOccupancy[];
  alerts: OfficeAlert[];
  events: OfficeEvent[];
  tasks: AgentOfficeTask[];
  metrics: AgentOfficeMetrics;
}

export interface OfficeStateEnvelope {
  scene: OfficeSceneSnapshot;
  workspace: AgentOfficeWorkspaceSnapshot;
}

export interface OfficeIngestSnapshotPayload {
  generated_at: string;
  workspace: AgentOfficeWorkspaceSnapshot;
  scene?: OfficeSceneSnapshot;
  source_host?: string;
}

export interface OfficeIngestEventPayload {
  event: OfficeEvent;
}

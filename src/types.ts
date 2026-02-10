export type AgentOfficeRole = 'orchestrator' | 'planner' | 'frontend' | 'backend' | 'reviewer' | 'worker';
export type AgentOfficeRuntimeStatus = 'online' | 'idle' | 'offline';

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

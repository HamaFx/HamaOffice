import { useEffect, useMemo, useState } from 'react';
import type { AgentOfficeIdentity, AgentOfficeTask, AgentOfficeWorkspaceSnapshot } from '../types';
import { fetchAgentOfficeWorkspace } from '../services/agentOfficeApi';
import {
  DashboardAgentRoster,
  DashboardHero,
  DashboardMetricsPanel,
  DashboardQueueBoard,
  DashboardStats,
} from '../components/dashboard';

const EMPTY_SNAPSHOT: AgentOfficeWorkspaceSnapshot = {
  generated_at: new Date(0).toISOString(),
  sources: {
    openclaw_config: false,
    queue_state: false,
    telemetry: false,
  },
  agents: [],
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
};

function formatAgo(timestamp: string | null): string {
  if (!timestamp) return 'No activity yet';
  const ms = Date.parse(timestamp);
  if (Number.isNaN(ms)) return 'Unknown';

  const deltaSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) return `${deltaMin}m ago`;
  const deltaHr = Math.floor(deltaMin / 60);
  if (deltaHr < 24) return `${deltaHr}h ago`;
  const deltaDay = Math.floor(deltaHr / 24);
  return `${deltaDay}d ago`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 4,
  }).format(value);
}

function formatMs(value: number): string {
  if (value <= 0) return '0m';
  const minutes = Math.round(value / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

function roleAccent(role: AgentOfficeIdentity['role']): string {
  if (role === 'orchestrator') return 'chip-indigo';
  if (role === 'planner') return 'chip-cyan';
  if (role === 'frontend') return 'chip-teal';
  if (role === 'backend') return 'chip-orange';
  if (role === 'reviewer') return 'chip-emerald';
  return 'chip-slate';
}

function statusTone(status: AgentOfficeIdentity['status']): string {
  if (status === 'online') return 'chip-emerald';
  if (status === 'idle') return 'chip-amber';
  return 'chip-slate';
}

function taskStatusTone(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === 'done' || normalized === 'pass') return 'chip-emerald';
  if (normalized === 'blocked' || normalized === 'block') return 'chip-rose';
  if (normalized === 'in_progress') return 'chip-cyan';
  return 'chip-slate';
}

function shortTask(task: AgentOfficeTask): string {
  if (task.goal.length <= 72) return task.goal;
  return `${task.goal.slice(0, 69)}...`;
}

export default function AgentOffice() {
  const [snapshot, setSnapshot] = useState<AgentOfficeWorkspaceSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const data = await fetchAgentOfficeWorkspace();
      setSnapshot(data);
      setError(null);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Failed to load Agent Office data';
      setError(message);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const onlineAgents = useMemo(
    () => snapshot.agents.filter((agent) => agent.status === 'online').length,
    [snapshot.agents],
  );

  const pendingTasks = useMemo(
    () => snapshot.tasks.filter((task) => task.status !== 'done' && task.status !== 'cancelled').length,
    [snapshot.tasks],
  );

  const maxStatusCount = useMemo(
    () => Math.max(1, ...snapshot.metrics.status_counts.map((entry) => entry.count)),
    [snapshot.metrics.status_counts],
  );

  const lastSnapshotLabel =
    snapshot.generated_at === EMPTY_SNAPSHOT.generated_at ? 'n/a' : new Date(snapshot.generated_at).toLocaleString();

  return (
    <div className="dashboard-page">
      <DashboardHero
        lastSnapshotLabel={lastSnapshotLabel}
        refreshing={refreshing}
        onRefresh={() => load(true)}
        hasSource={snapshot.sources.openclaw_config}
        error={error}
      />

      <DashboardStats
        onlineAgents={onlineAgents}
        pendingTasks={pendingTasks}
        passRatePct={Math.round(snapshot.metrics.pass_rate * 100)}
        avgLeadTimeLabel={formatMs(snapshot.metrics.avg_lead_time_ms)}
      />

      <DashboardAgentRoster
        agents={snapshot.agents}
        loading={loading}
        roleAccent={roleAccent}
        statusTone={statusTone}
        formatAgo={formatAgo}
      />

      <section className="dashboard-main-grid">
        <DashboardQueueBoard
          tasks={snapshot.tasks}
          taskStatusTone={taskStatusTone}
          shortTask={shortTask}
          formatAgo={formatAgo}
        />

        <DashboardMetricsPanel
          metrics={snapshot.metrics}
          maxStatusCount={maxStatusCount}
          formatCurrency={formatCurrency}
        />
      </section>
    </div>
  );
}

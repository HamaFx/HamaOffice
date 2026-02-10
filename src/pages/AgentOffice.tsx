import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Clock3,
  GitBranch,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  Users2,
  Workflow,
  Wrench,
} from 'lucide-react';
import type { AgentOfficeIdentity, AgentOfficeTask, AgentOfficeWorkspaceSnapshot } from '../types';
import { fetchAgentOfficeWorkspace } from '../services/agentOfficeApi';
import { PixelAvatar } from '../components/PixelAvatar';

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

function StatusRail({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="status-rail">
      <div className="status-row">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="status-track">
        <div className="status-fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
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

  return (
    <div className="office-root">
      <section className="hero">
        <div>
          <p className="hero-badge">
            <Workflow size={14} /> Agent Office
          </p>
          <h1>Mission Control Workspace</h1>
          <p className="hero-copy">
            Live panel for orchestrator, planner, frontend, backend, and reviewer agents with queue state, fix loops, and quality metrics.
          </p>
          <p className="hero-meta">
            Last snapshot: {snapshot.generated_at === EMPTY_SNAPSHOT.generated_at ? 'n/a' : new Date(snapshot.generated_at).toLocaleString()}
          </p>
        </div>

        <button type="button" onClick={() => void load(true)} disabled={refreshing} className="btn-refresh">
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Refresh
        </button>
      </section>

      {!snapshot.sources.openclaw_config && (
        <div className="notice notice-warn">
          <strong>Data source not connected.</strong> Set <code>AGENT_OFFICE_OPENCLAW_DIR</code> and <code>AGENT_OFFICE_WORKSPACE_DIR</code> in env.
        </div>
      )}

      {error && (
        <div className="notice notice-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <section className="stats-grid">
        <article className="stat-card"><p>Agents Online</p><h2>{onlineAgents}</h2><Users2 size={18} /></article>
        <article className="stat-card"><p>Open Tasks</p><h2>{pendingTasks}</h2><Wrench size={18} /></article>
        <article className="stat-card"><p>Pass Rate</p><h2>{Math.round(snapshot.metrics.pass_rate * 100)}%</h2><ShieldCheck size={18} /></article>
        <article className="stat-card"><p>Avg Lead Time</p><h2>{formatMs(snapshot.metrics.avg_lead_time_ms)}</h2><TimerReset size={18} /></article>
      </section>

      <section className="panel">
        <h3><Activity size={18} /> Agent Roster</h3>
        {loading ? (
          <div className="empty">Loading agents...</div>
        ) : snapshot.agents.length === 0 ? (
          <div className="empty">No agents found in OpenClaw config.</div>
        ) : (
          <div className="agents-grid">
            {snapshot.agents.map((agent) => (
              <article key={agent.id} className="agent-card">
                <div className="agent-head">
                  <PixelAvatar seed={agent.avatarSeed} role={agent.role} emoji={agent.emoji} displayName={agent.displayName} />
                  <div className="agent-meta">
                    <div className="agent-title-row">
                      <h4>{agent.displayName}</h4>
                      <span className={`chip ${statusTone(agent.status)}`}>{agent.status}</span>
                    </div>
                    <p className="agent-sub">{agent.characterName}</p>
                    <p className="agent-model">{agent.model}</p>
                    <div className="chips">
                      <span className={`chip ${roleAccent(agent.role)}`}>{agent.role}</span>
                      <span className="chip chip-slate">{agent.identity.callsign}</span>
                      <span className="chip chip-teal">{agent.identity.gait}</span>
                      {agent.isDefault && <span className="chip chip-indigo">default</span>}
                      {agent.hasBinding && <span className="chip chip-cyan">routed</span>}
                    </div>
                  </div>
                </div>

                <div className="agent-stats">
                  <div><small>Tokens</small><strong>{agent.totalTokens.toLocaleString()}</strong></div>
                  <div><small>Last Seen</small><strong>{formatAgo(agent.lastUpdatedAt)}</strong></div>
                </div>

                <p className="agent-summary">{agent.lastSummary || 'No recent session summary available.'}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="two-col">
        <article className="panel">
          <h3><GitBranch size={18} /> Queue Board</h3>
          {snapshot.tasks.length === 0 ? (
            <div className="empty">No queue tasks captured yet.</div>
          ) : (
            <div className="task-list">
              {snapshot.tasks.slice(0, 10).map((task) => (
                <div key={task.task_id} className="task-card">
                  <div className="chips">
                    <span className={`chip ${taskStatusTone(task.status)}`}>{task.status}</span>
                    <span className="chip chip-slate">{task.priority}</span>
                    <span className="task-owner">{task.owner}</span>
                  </div>
                  <p>{shortTask(task)}</p>
                  <div className="task-meta">
                    <span><Wrench size={13} /> Attempts {task.attempts}</span>
                    <span><ShieldCheck size={13} /> Reviews {task.review_loops}</span>
                    <span><Clock3 size={13} /> {formatAgo(task.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <h3><ShieldCheck size={18} /> Quality Metrics</h3>
          <div className="metric-grid">
            <div><small>Total Tasks</small><strong>{snapshot.metrics.total_tasks}</strong></div>
            <div><small>Avg Attempts</small><strong>{snapshot.metrics.avg_attempts.toFixed(1)}</strong></div>
            <div><small>Avg Review Loops</small><strong>{snapshot.metrics.avg_review_loops.toFixed(1)}</strong></div>
            <div><small>Total Cost</small><strong>{formatCurrency(snapshot.metrics.total_cost_usd)}</strong></div>
          </div>

          <div className="status-wrap">
            <h4>Status Distribution</h4>
            {snapshot.metrics.status_counts.length === 0 ? (
              <p className="muted">No status metrics yet.</p>
            ) : (
              snapshot.metrics.status_counts.map((entry) => (
                <StatusRail key={entry.status} label={entry.status} value={entry.count} max={maxStatusCount} />
              ))
            )}
          </div>

          <div className="status-wrap">
            <h4>Top Failure Causes</h4>
            {snapshot.metrics.top_failure_causes.length === 0 ? (
              <p className="muted">No failures recorded.</p>
            ) : (
              snapshot.metrics.top_failure_causes.map((entry) => (
                <div key={entry.cause} className="failure-row">
                  <span>{entry.cause}</span>
                  <span className="chip chip-rose">{entry.count}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

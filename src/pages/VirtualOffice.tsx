import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Filter, RefreshCw, Search, Signal, Sparkles, Workflow } from 'lucide-react';
import { OfficeScene } from '../components/office/OfficeScene';
import { useOfficeLiveState } from '../hooks/useOfficeLiveState';
import { useOfficeSimulation } from '../hooks/useOfficeSimulation';
import type { AgentOfficeRole, AgentOfficeRuntimeStatus } from '../types';

const roleOptions: Array<{ value: 'all' | AgentOfficeRole; label: string }> = [
  { value: 'all', label: 'All Roles' },
  { value: 'orchestrator', label: 'Orchestrator' },
  { value: 'planner', label: 'Planner' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'worker', label: 'Worker' },
];

const statusOptions: Array<{ value: 'all' | AgentOfficeRuntimeStatus; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'online', label: 'Online' },
  { value: 'idle', label: 'Idle' },
  { value: 'offline', label: 'Offline' },
];

const densityOptions = [
  { value: 'cozy', label: 'Cozy' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'dense', label: 'Dense' },
] as const;

function prettyState(value: string): string {
  return value.replace(/_/g, ' ');
}

function formatAgo(value: string): string {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return value;
  const deltaSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const mins = Math.floor(deltaSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function VirtualOffice() {
  const { envelope, timeline, loading, refreshing, error, refresh } = useOfficeLiveState();
  const scene = envelope?.scene ?? null;
  const workspace = envelope?.workspace ?? null;
  const { agents } = useOfficeSimulation(scene);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AgentOfficeRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AgentOfficeRuntimeStatus>('all');
  const [density, setDensity] = useState<(typeof densityOptions)[number]['value']>('balanced');

  const filteredAgents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return agents.filter((agent) => {
      if (roleFilter !== 'all' && agent.role !== roleFilter) return false;
      if (statusFilter !== 'all' && agent.runtimeStatus !== statusFilter) return false;
      if (!query) return true;

      return (
        agent.displayName.toLowerCase().includes(query) ||
        agent.identity.callsign.toLowerCase().includes(query) ||
        agent.agentId.toLowerCase().includes(query)
      );
    });
  }, [agents, roleFilter, search, statusFilter]);

  useEffect(() => {
    if (!filteredAgents.length) {
      setSelectedAgentId(null);
      return;
    }

    if (!selectedAgentId) {
      setSelectedAgentId(filteredAgents[0].agentId);
      return;
    }

    const exists = filteredAgents.some((agent) => agent.agentId === selectedAgentId);
    if (!exists) {
      setSelectedAgentId(filteredAgents[0].agentId);
    }
  }, [filteredAgents, selectedAgentId]);

  const selectedAgent = useMemo(
    () => filteredAgents.find((agent) => agent.agentId === selectedAgentId) ?? null,
    [filteredAgents, selectedAgentId],
  );

  const selectedTask = useMemo(() => {
    if (!scene || !selectedAgent?.currentTaskId) return null;
    return scene.tasks.find((task) => task.task_id === selectedAgent.currentTaskId) ?? null;
  }, [scene, selectedAgent]);

  const onlineCount = useMemo(
    () => agents.filter((agent) => agent.runtimeStatus === 'online').length,
    [agents],
  );

  const blockedCount = useMemo(
    () => (scene ? scene.tasks.filter((task) => task.status.toLowerCase().includes('blocked')).length : 0),
    [scene],
  );

  const syncClass = scene?.sync_status === 'live' ? 'chip-emerald' : scene?.sync_status === 'stale' ? 'chip-amber' : 'chip-rose';

  return (
    <div className="virtual-office-root">
      <section className="virtual-hero">
        <div>
          <p className="hero-badge">
            <Sparkles size={14} /> Virtual Office
          </p>
          <h1>Agent Workspace Simulation</h1>
          <p className="hero-copy">
            Pixel agents navigate intake, build bays, and reviewer gate as workflow status changes. This scene mirrors live queue telemetry.
          </p>
          <div className="chips virtual-hero-chips">
            <span className={`chip ${syncClass}`}>sync {scene?.sync_status ?? 'loading'}</span>
            <span className="chip chip-slate">online {onlineCount}</span>
            <span className="chip chip-rose">blocked {blockedCount}</span>
            <span className="chip chip-indigo">tasks {scene?.tasks.length ?? 0}</span>
          </div>
        </div>

        <button type="button" className="btn-refresh" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Refresh
        </button>
      </section>

      {error && (
        <div className="notice notice-error">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <section className="panel virtual-controls">
        <div className="control-inline">
          <label>
            <Search size={14} /> Search
          </label>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="agent, callsign, id"
          />
        </div>

        <div className="control-inline">
          <label>
            <Filter size={14} /> Role
          </label>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-inline">
          <label>
            <Signal size={14} /> Runtime
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-inline">
          <label>
            <Workflow size={14} /> Density
          </label>
          <select value={density} onChange={(event) => setDensity(event.target.value as typeof density)}>
            {densityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {!scene ? (
        <section className="panel">
          <div className="empty">{loading ? 'Loading virtual office state...' : 'No scene data available.'}</div>
        </section>
      ) : (
        <section className="virtual-layout">
          <article className="panel virtual-scene-panel">
            <h3>Office Map</h3>
            <OfficeScene
              scene={scene}
              agents={filteredAgents}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
              density={density}
            />
          </article>

          <aside className="virtual-sidebar">
            <article className="panel virtual-inspector">
              <h3>Agent Inspector</h3>
              {!selectedAgent ? (
                <div className="empty">Select an agent in the office map.</div>
              ) : (
                <div className="inspector-grid">
                  <p className="inspector-name">{selectedAgent.displayName}</p>
                  <p className="inspector-callsign">{selectedAgent.identity.callsign}</p>
                  <div className="chips">
                    <span className="chip chip-indigo">{selectedAgent.role}</span>
                    <span className="chip chip-cyan">{selectedAgent.runtimeStatus}</span>
                    <span className="chip chip-teal">{selectedAgent.activityState}</span>
                  </div>

                  <div className="inspector-meta">
                    <div>
                      <small>Trait</small>
                      <strong>{selectedAgent.identity.trait}</strong>
                    </div>
                    <div>
                      <small>Gait</small>
                      <strong>{selectedAgent.identity.gait}</strong>
                    </div>
                    <div>
                      <small>Accessory</small>
                      <strong>{selectedAgent.identity.accessory}</strong>
                    </div>
                    <div>
                      <small>Target Zone</small>
                      <strong>{prettyState(selectedAgent.targetZoneId)}</strong>
                    </div>
                  </div>

                  {selectedTask ? (
                    <div className="task-card">
                      <p>{selectedTask.goal}</p>
                      <div className="chips">
                        <span className="chip chip-slate">{selectedTask.status}</span>
                        <span className="chip chip-amber">attempts {selectedTask.attempts}</span>
                        <span className="chip chip-orange">reviews {selectedTask.review_loops}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="muted">No active task for this agent.</p>
                  )}
                </div>
              )}
            </article>

            <article className="panel virtual-ticker">
              <h3>Live Ticker</h3>
              {timeline.length === 0 ? (
                <div className="empty">No timeline events yet.</div>
              ) : (
                <div className="ticker-list">
                  {timeline.slice(0, 14).map((event) => (
                    <div key={event.id} className="ticker-item">
                      <div className="chips">
                        <span className="chip chip-slate">{event.type}</span>
                        <span className={`chip ${event.severity === 'critical' ? 'chip-rose' : event.severity === 'warning' ? 'chip-amber' : 'chip-emerald'}`}>
                          {event.severity}
                        </span>
                      </div>
                      <p>{event.message}</p>
                      <small>{formatAgo(event.createdAt)}</small>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="panel virtual-roster">
              <h3>Filtered Agents</h3>
              <div className="roster-list">
                {filteredAgents.map((agent) => (
                  <button
                    type="button"
                    key={agent.agentId}
                    className={`roster-item ${agent.agentId === selectedAgentId ? 'roster-item-selected' : ''}`}
                    onClick={() => setSelectedAgentId(agent.agentId)}
                  >
                    <span>{agent.identity.callsign}</span>
                    <span>{agent.displayName}</span>
                    <span className="muted">{agent.activityState}</span>
                  </button>
                ))}
              </div>
            </article>
          </aside>
        </section>
      )}

      {workspace && (
        <section className="panel virtual-footer-metrics">
          <h3>Workspace Quality Snapshot</h3>
          <div className="metric-grid">
            <div>
              <small>Total Tasks</small>
              <strong>{workspace.metrics.total_tasks}</strong>
            </div>
            <div>
              <small>Pass Rate</small>
              <strong>{Math.round(workspace.metrics.pass_rate * 100)}%</strong>
            </div>
            <div>
              <small>Avg Review Loops</small>
              <strong>{workspace.metrics.avg_review_loops.toFixed(1)}</strong>
            </div>
            <div>
              <small>Avg Attempts</small>
              <strong>{workspace.metrics.avg_attempts.toFixed(1)}</strong>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

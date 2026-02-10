import type { AgentOfficeTask, OfficeEvent } from '../../types';
import type { SimulatedOfficeAgent } from '../../lib/simulation';

interface VirtualOfficeSidebarProps {
  selectedAgent: SimulatedOfficeAgent | null;
  selectedTask: AgentOfficeTask | null;
  timeline: OfficeEvent[];
  filteredAgents: SimulatedOfficeAgent[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
}

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

function toneForSeverity(severity: 'info' | 'warning' | 'critical'): string {
  if (severity === 'critical') return 'chip-rose';
  if (severity === 'warning') return 'chip-amber';
  return 'chip-emerald';
}

export function VirtualOfficeSidebar({
  selectedAgent,
  selectedTask,
  timeline,
  filteredAgents,
  selectedAgentId,
  onSelectAgent,
}: VirtualOfficeSidebarProps) {
  return (
    <aside className="virtual-sidebar vo-sidebar">
      <article className="panel virtual-inspector vo-inspector">
        <h3>Agent Inspector</h3>
        {!selectedAgent ? (
          <div className="empty">Select an agent in the office map.</div>
        ) : (
          <div className="inspector-grid">
            <p className="inspector-name">{selectedAgent.displayName}</p>
            <p className="inspector-callsign">{selectedAgent.identity.callsign}</p>
            <div className="identity-swatch-row">
              <span style={{ backgroundColor: selectedAgent.identity.baseColor }} />
              <span style={{ backgroundColor: selectedAgent.identity.accentColor }} />
              <span style={{ backgroundColor: selectedAgent.identity.accessoryColor }} />
            </div>
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

      <article className="panel virtual-ticker vo-ticker">
        <h3>Live Ticker</h3>
        {timeline.length === 0 ? (
          <div className="empty">No timeline events yet.</div>
        ) : (
          <div className="ticker-list">
            {timeline.slice(0, 14).map((event) => (
              <div key={event.id} className="ticker-item">
                <div className="chips">
                  <span className="chip chip-slate">{event.type}</span>
                  <span className={`chip ${toneForSeverity(event.severity)}`}>{event.severity}</span>
                </div>
                <p>{event.message}</p>
                <small>{formatAgo(event.createdAt)}</small>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="panel virtual-roster vo-roster">
        <h3>Filtered Agents</h3>
        <div className="roster-list">
          {filteredAgents.map((agent) => (
            <button
              type="button"
              key={agent.agentId}
              className={`roster-item ${agent.agentId === selectedAgentId ? 'roster-item-selected' : ''}`}
              onClick={() => onSelectAgent(agent.agentId)}
            >
              <span>{agent.identity.callsign}</span>
              <span>{agent.displayName}</span>
              <span className="muted">
                {agent.runtimeStatus} / {agent.activityState}
              </span>
            </button>
          ))}
        </div>
      </article>
    </aside>
  );
}

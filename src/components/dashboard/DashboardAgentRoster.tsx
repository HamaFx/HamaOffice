import { Activity } from 'lucide-react';
import type { AgentOfficeIdentity } from '../../types';
import { PixelAvatar } from '../PixelAvatar';

interface DashboardAgentRosterProps {
  agents: AgentOfficeIdentity[];
  loading: boolean;
  roleAccent: (role: AgentOfficeIdentity['role']) => string;
  statusTone: (status: AgentOfficeIdentity['status']) => string;
  formatAgo: (timestamp: string | null) => string;
}

export function DashboardAgentRoster({
  agents,
  loading,
  roleAccent,
  statusTone,
  formatAgo,
}: DashboardAgentRosterProps) {
  return (
    <section className="panel dashboard-panel">
      <h3>
        <Activity size={18} /> Agent Roster
      </h3>
      {loading ? (
        <div className="empty">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="empty">No agents found in OpenClaw config.</div>
      ) : (
        <div className="dashboard-agents-grid">
          {agents.map((agent) => (
            <article key={agent.id} className="dashboard-agent-card">
              <div className="dashboard-agent-head">
                <PixelAvatar seed={agent.avatarSeed} role={agent.role} emoji={agent.emoji} displayName={agent.displayName} />
                <div className="dashboard-agent-meta">
                  <div className="dashboard-agent-title-row">
                    <h4>{agent.displayName}</h4>
                    <span className={`chip ${statusTone(agent.status)}`}>{agent.status}</span>
                  </div>
                  <p className="dashboard-agent-sub">{agent.characterName}</p>
                  <p className="dashboard-agent-model">{agent.model}</p>
                  <div className="chips">
                    <span className={`chip ${roleAccent(agent.role)}`}>{agent.role}</span>
                    <span className="chip chip-slate">{agent.identity.callsign}</span>
                    <span className="chip chip-teal">{agent.identity.gait}</span>
                    {agent.isDefault && <span className="chip chip-indigo">default</span>}
                    {agent.hasBinding && <span className="chip chip-cyan">routed</span>}
                  </div>
                </div>
              </div>

              <div className="dashboard-agent-stats">
                <div>
                  <small>Tokens</small>
                  <strong>{agent.totalTokens.toLocaleString()}</strong>
                </div>
                <div>
                  <small>Last Seen</small>
                  <strong>{formatAgo(agent.lastUpdatedAt)}</strong>
                </div>
              </div>

              <p className="dashboard-agent-summary">{agent.lastSummary || 'No recent session summary available.'}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

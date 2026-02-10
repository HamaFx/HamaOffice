import { AlertTriangle, Filter, Signal, Workflow } from 'lucide-react';
import type { AgentOfficeWorkspaceSnapshot } from '../../types';

interface VirtualOfficeOverviewProps {
  totalAgents: number;
  filteredAgents: number;
  criticalAlerts: number;
  workspace: AgentOfficeWorkspaceSnapshot | null;
}

export function VirtualOfficeOverview({
  totalAgents,
  filteredAgents,
  criticalAlerts,
  workspace,
}: VirtualOfficeOverviewProps) {
  return (
    <section className="virtual-overview-grid vo-overview-grid">
      <article className="stat-card vo-overview-card">
        <p>Agents Tracked</p>
        <h2>{totalAgents}</h2>
        <Signal size={18} />
      </article>
      <article className="stat-card vo-overview-card">
        <p>Filtered</p>
        <h2>{filteredAgents}</h2>
        <Filter size={18} />
      </article>
      <article className="stat-card vo-overview-card">
        <p>Critical Alerts</p>
        <h2>{criticalAlerts}</h2>
        <AlertTriangle size={18} />
      </article>
      <article className="stat-card vo-overview-card">
        <p>Pass Rate</p>
        <h2>{workspace ? `${Math.round(workspace.metrics.pass_rate * 100)}%` : '--'}</h2>
        <Workflow size={18} />
      </article>
    </section>
  );
}

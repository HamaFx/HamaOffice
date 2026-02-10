import { AlertCircle, RefreshCw, Workflow } from 'lucide-react';

interface DashboardHeroProps {
  lastSnapshotLabel: string;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  hasSource: boolean;
  error: string | null;
}

export function DashboardHero({ lastSnapshotLabel, refreshing, onRefresh, hasSource, error }: DashboardHeroProps) {
  return (
    <>
      <section className="dashboard-hero">
        <div>
          <p className="hero-badge">
            <Workflow size={14} /> Agent Dashboard
          </p>
          <h1>Mission Control Workspace</h1>
          <p className="hero-copy">
            Unified view of orchestrator, planner, frontend, backend, and reviewer agents with queue state and quality guardrails.
          </p>
          <p className="hero-meta">Last snapshot: {lastSnapshotLabel}</p>
        </div>

        <button type="button" onClick={() => void onRefresh()} disabled={refreshing} className="btn-refresh">
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Refresh
        </button>
      </section>

      {!hasSource && (
        <div className="notice notice-warn">
          <strong>Data source not connected.</strong> Set <code>AGENT_OFFICE_OPENCLAW_DIR</code> and <code>AGENT_OFFICE_WORKSPACE_DIR</code> in env.
        </div>
      )}

      {error && (
        <div className="notice notice-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}
    </>
  );
}

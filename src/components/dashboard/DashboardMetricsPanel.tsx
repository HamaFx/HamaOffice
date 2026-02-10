import { ShieldCheck } from 'lucide-react';
import type { AgentOfficeMetrics } from '../../types';

interface DashboardMetricsPanelProps {
  metrics: AgentOfficeMetrics;
  maxStatusCount: number;
  formatCurrency: (value: number) => string;
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

export function DashboardMetricsPanel({ metrics, maxStatusCount, formatCurrency }: DashboardMetricsPanelProps) {
  return (
    <article className="panel dashboard-panel">
      <h3>
        <ShieldCheck size={18} /> Quality Metrics
      </h3>
      <div className="metric-grid">
        <div>
          <small>Total Tasks</small>
          <strong>{metrics.total_tasks}</strong>
        </div>
        <div>
          <small>Avg Attempts</small>
          <strong>{metrics.avg_attempts.toFixed(1)}</strong>
        </div>
        <div>
          <small>Avg Review Loops</small>
          <strong>{metrics.avg_review_loops.toFixed(1)}</strong>
        </div>
        <div>
          <small>Total Cost</small>
          <strong>{formatCurrency(metrics.total_cost_usd)}</strong>
        </div>
      </div>

      <div className="status-wrap">
        <h4>Status Distribution</h4>
        {metrics.status_counts.length === 0 ? (
          <p className="muted">No status metrics yet.</p>
        ) : (
          metrics.status_counts.map((entry) => (
            <StatusRail key={entry.status} label={entry.status} value={entry.count} max={maxStatusCount} />
          ))
        )}
      </div>

      <div className="status-wrap">
        <h4>Top Failure Causes</h4>
        {metrics.top_failure_causes.length === 0 ? (
          <p className="muted">No failures recorded.</p>
        ) : (
          metrics.top_failure_causes.map((entry) => (
            <div key={entry.cause} className="failure-row">
              <span>{entry.cause}</span>
              <span className="chip chip-rose">{entry.count}</span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

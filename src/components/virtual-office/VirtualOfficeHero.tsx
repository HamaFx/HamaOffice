import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import type { OfficeSceneSnapshot, OfficeTheme } from '../../types';

interface VirtualOfficeHeroProps {
  scene: OfficeSceneSnapshot | null;
  onlineCount: number;
  blockedCount: number;
  criticalAlerts: number;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  error: string | null;
  theme: OfficeTheme;
}

function syncTone(scene: OfficeSceneSnapshot | null): string {
  if (!scene) return 'chip-slate';
  if (scene.sync_status === 'live') return 'chip-emerald';
  if (scene.sync_status === 'stale') return 'chip-amber';
  return 'chip-rose';
}

export function VirtualOfficeHero({
  scene,
  onlineCount,
  blockedCount,
  criticalAlerts,
  refreshing,
  onRefresh,
  error,
  theme,
}: VirtualOfficeHeroProps) {
  return (
    <>
      <section className="virtual-hero vo-hero">
        <div>
          <p className="hero-badge vo-badge">
            <Sparkles size={14} /> Virtual Office
          </p>
          <h1>Agent Workspace Simulation</h1>
          <p className="hero-copy vo-copy">
            Live operational floor for multi-agent execution. Monitor movement, workload pressure, and review bottlenecks in one layout.
          </p>
          <div className="chips virtual-hero-chips">
            <span className={`chip ${syncTone(scene)}`}>sync {scene?.sync_status ?? 'loading'}</span>
            <span className="chip chip-slate">online {onlineCount}</span>
            <span className="chip chip-rose">blocked {blockedCount}</span>
            <span className="chip chip-orange">critical {criticalAlerts}</span>
            <span className="chip chip-indigo">tasks {scene?.tasks.length ?? 0}</span>
            <span className="chip chip-cyan">theme {theme}</span>
          </div>
        </div>

        <button type="button" className="btn-refresh vo-refresh" onClick={() => void onRefresh()} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Refresh
        </button>
      </section>

      {error && (
        <div className="notice notice-error vo-error">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
    </>
  );
}

import { useState } from 'react';
import AgentOffice from './pages/AgentOffice';
import VirtualOffice from './pages/VirtualOffice';

type OfficeView = 'virtual' | 'dashboard';

export function App() {
  const [view, setView] = useState<OfficeView>('virtual');

  return (
    <div className="site-shell">
      <header className="site-topbar">
        <div className="site-brand">
          <span>Hama Office</span>
          <small>Agent Engineering Workspace</small>
        </div>

        <div className="site-nav" role="tablist" aria-label="Office Views">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'virtual'}
            className={`site-nav-btn ${view === 'virtual' ? 'site-nav-btn-active' : ''}`}
            onClick={() => setView('virtual')}
          >
            Virtual Office
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'dashboard'}
            className={`site-nav-btn ${view === 'dashboard' ? 'site-nav-btn-active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </button>
        </div>

        <div className="site-status-chip">
          <span className={`status-dot ${view === 'virtual' ? 'status-dot-cyan' : 'status-dot-green'}`} />
          {view === 'virtual' ? 'Simulation View' : 'Ops Dashboard'}
        </div>
      </header>

      <main className="site-main">{view === 'virtual' ? <VirtualOffice /> : <AgentOffice />}</main>
    </div>
  );
}

import { useState } from 'react';
import AgentOffice from './pages/AgentOffice';
import VirtualOffice from './pages/VirtualOffice';

type OfficeView = 'virtual' | 'dashboard';

export function App() {
  const [view, setView] = useState<OfficeView>('virtual');

  return (
    <div>
      <header className="app-shell-header">
        <div className="app-shell-brand">
          <span>Hama Office</span>
          <small>Agent Workspace</small>
        </div>

        <div className="app-shell-tabs" role="tablist" aria-label="Office Views">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'virtual'}
            className={view === 'virtual' ? 'tab-active' : ''}
            onClick={() => setView('virtual')}
          >
            Virtual Office
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'dashboard'}
            className={view === 'dashboard' ? 'tab-active' : ''}
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </button>
        </div>
      </header>

      {view === 'virtual' ? <VirtualOffice /> : <AgentOffice />}
    </div>
  );
}

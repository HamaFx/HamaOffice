import { OfficeScene } from '../office/OfficeScene';
import type { OfficeDensity } from '../../pages/virtualOfficeOptions';
import type { OfficeSceneSnapshot, OfficeTheme } from '../../types';
import type { SimulatedOfficeAgent } from '../../lib/simulation';

interface VirtualOfficeScenePanelProps {
  scene: OfficeSceneSnapshot;
  agents: SimulatedOfficeAgent[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
  density: OfficeDensity;
  theme: OfficeTheme;
}

export function VirtualOfficeScenePanel({
  scene,
  agents,
  selectedAgentId,
  onSelectAgent,
  density,
  theme,
}: VirtualOfficeScenePanelProps) {
  return (
    <article className="panel virtual-scene-panel vo-scene-card">
      <h3>Office Map</h3>
      <div className="office-map-hud vo-map-hud">
        <div className="office-map-hud-row vo-map-hud-row">
          <span className="chip chip-slate">agents {agents.length}</span>
          <span className="chip chip-cyan">zones {scene.zones.length}</span>
          <span className="chip chip-teal">density {density}</span>
          <span className="chip chip-indigo">theme {theme}</span>
        </div>
        <p>Flow: intake to role bay to reviewer gate to break area</p>
      </div>

      <OfficeScene
        scene={scene}
        agents={agents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={onSelectAgent}
        density={density}
        theme={theme}
      />
    </article>
  );
}

import type { OfficeSceneSnapshot } from '../../types';
import type { SimulatedOfficeAgent } from '../../lib/simulation';
import { AgentSprite } from './AgentSprite';

type OfficeDensity = 'cozy' | 'balanced' | 'dense';

interface OfficeSceneProps {
  scene: OfficeSceneSnapshot;
  agents: SimulatedOfficeAgent[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  density: OfficeDensity;
}

function tileSizeForDensity(density: OfficeDensity): number {
  if (density === 'cozy') return 22;
  if (density === 'dense') return 14;
  return 18;
}

export function OfficeScene({ scene, agents, selectedAgentId, onSelectAgent, density }: OfficeSceneProps) {
  const tileSize = tileSizeForDensity(density);
  const widthPx = scene.width * tileSize;
  const heightPx = scene.height * tileSize;

  return (
    <div className="office-scene-shell">
      <div
        className="office-scene"
        style={{
          width: `${widthPx}px`,
          height: `${heightPx}px`,
          ['--office-tile-size' as string]: `${tileSize}px`,
        }}
      >
        {scene.zones.map((zone) => {
          const occupancy = scene.occupancy.find((entry) => entry.zoneId === zone.id);
          return (
            <div
              key={zone.id}
              className="office-zone"
              style={{
                left: `${zone.x * tileSize}px`,
                top: `${zone.y * tileSize}px`,
                width: `${zone.width * tileSize}px`,
                height: `${zone.height * tileSize}px`,
              }}
            >
              <header>
                <strong>{zone.label}</strong>
                <span>
                  {occupancy?.count ?? 0}/{occupancy?.capacity ?? zone.capacity}
                </span>
              </header>
            </div>
          );
        })}

        {agents.map((agent) => (
          <button
            key={agent.agentId}
            type="button"
            className={`office-agent-token ${selectedAgentId === agent.agentId ? 'office-agent-token-selected' : ''}`}
            style={{
              left: `${agent.position.x * tileSize}px`,
              top: `${agent.position.y * tileSize}px`,
            }}
            onClick={() => onSelectAgent(agent.agentId)}
          >
            <AgentSprite
              identity={agent.identity}
              frame={agent.frame}
              activityState={agent.activityState}
              selected={selectedAgentId === agent.agentId}
            />
            <span className="office-agent-label">{agent.identity.callsign}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { OFFICE_OBSTACLES } from '../../../shared/officeLayout';
import { OFFICE_PROPS } from '../../../shared/officeProps';
import type { OfficeSceneSnapshot } from '../../types';
import type { SimulatedOfficeAgent } from '../../lib/simulation';
import type { OfficeDensity } from '../../pages/virtualOfficeOptions';
import type { OfficeTheme } from '../../types';
import { AgentSprite } from './AgentSprite';

interface OfficeSceneProps {
  scene: OfficeSceneSnapshot;
  agents: SimulatedOfficeAgent[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  density: OfficeDensity;
  theme: OfficeTheme;
}

function tileSizeForDensity(density: OfficeDensity): number {
  if (density === 'cozy') return 22;
  if (density === 'dense') return 14;
  return 18;
}

function zoneClass(zoneId: string): string {
  return `office-zone office-zone-${zoneId}`;
}

function propClass(kind: string): string {
  return `office-prop office-prop-${kind}`;
}

export function OfficeScene({ scene, agents, selectedAgentId, onSelectAgent, density, theme }: OfficeSceneProps) {
  const tileSize = tileSizeForDensity(density);
  const widthPx = scene.width * tileSize;
  const heightPx = scene.height * tileSize;
  const tiles = useMemo(
    () =>
      Array.from({ length: scene.width * scene.height }, (_, index) => ({
        x: index % scene.width,
        y: Math.floor(index / scene.width),
      })),
    [scene.height, scene.width],
  );

  return (
    <div className={`office-scene-shell office-scene-theme-${theme}`}>
      <div
        className="office-scene"
        style={{
          width: `${widthPx}px`,
          height: `${heightPx}px`,
          ['--office-tile-size' as string]: `${tileSize}px`,
        }}
      >
        <div className="office-ambience-layer" aria-hidden>
          <span className="office-ambience-orb" />
        </div>

        <div className="office-floor-layer" aria-hidden>
          {tiles.map((tile) => (
            <span
              key={`tile-${tile.x}-${tile.y}`}
              className={`office-floor-tile ${(tile.x + tile.y) % 2 === 0 ? 'office-floor-tile-a' : 'office-floor-tile-b'}`}
              style={{
                left: `${tile.x * tileSize}px`,
                top: `${tile.y * tileSize}px`,
                width: `${tileSize}px`,
                height: `${tileSize}px`,
              }}
            />
          ))}
        </div>

        <div className="office-obstacle-layer" aria-hidden>
          {OFFICE_OBSTACLES.map((obstacle, index) => (
            <span
              key={`obstacle-${index}`}
              className="office-obstacle"
              style={{
                left: `${obstacle.x * tileSize}px`,
                top: `${obstacle.y * tileSize}px`,
                width: `${obstacle.width * tileSize}px`,
                height: `${obstacle.height * tileSize}px`,
              }}
            />
          ))}
        </div>

        <div className="office-prop-layer" aria-hidden>
          {OFFICE_PROPS.map((prop) => (
            <span
              key={prop.id}
              className={propClass(prop.kind)}
              style={{
                left: `${prop.x * tileSize}px`,
                top: `${prop.y * tileSize}px`,
                width: `${prop.width * tileSize}px`,
                height: `${prop.height * tileSize}px`,
              }}
            />
          ))}
        </div>

        {scene.zones.map((zone) => {
          const occupancy = scene.occupancy.find((entry) => entry.zoneId === zone.id);
          return (
            <div
              key={zone.id}
              className={zoneClass(zone.id)}
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
            className={`office-agent-token ${selectedAgentId === agent.agentId ? 'office-agent-token-selected' : ''} ${agent.isMoving ? 'office-agent-token-moving' : ''}`}
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

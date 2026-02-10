import { useMemo } from 'react';
import { OFFICE_OBSTACLES } from '../../../shared/officeLayout';
import { OFFICE_PROPS } from '../../../shared/officeProps';
import type { OfficeSceneSnapshot, OfficeTheme } from '../../types';
import type { SimulatedOfficeAgent } from '../../lib/simulation';
import type { OfficeDensity } from '../../pages/virtualOfficeOptions';
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
  return `vo-zone vo-zone-${zoneId}`;
}

function propClass(kind: string): string {
  return `vo-prop vo-prop-${kind}`;
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
    <div className={`vo-scene-shell vo-theme-${theme}`}>
      <div
        className="vo-scene"
        style={{
          width: `${widthPx}px`,
          height: `${heightPx}px`,
          ['--vo-tile-size' as string]: `${tileSize}px`,
        }}
      >
        <div className="vo-ambience-layer" aria-hidden>
          <span className="vo-ambience-orb" />
        </div>

        <div className="vo-floor-layer" aria-hidden>
          {tiles.map((tile) => (
            <span
              key={`tile-${tile.x}-${tile.y}`}
              className={`vo-floor-tile ${(tile.x + tile.y) % 2 === 0 ? 'vo-floor-a' : 'vo-floor-b'}`}
              style={{
                left: `${tile.x * tileSize}px`,
                top: `${tile.y * tileSize}px`,
                width: `${tileSize}px`,
                height: `${tileSize}px`,
              }}
            />
          ))}
        </div>

        <div className="vo-obstacle-layer" aria-hidden>
          {OFFICE_OBSTACLES.map((obstacle, index) => (
            <span
              key={`obstacle-${index}`}
              className="vo-obstacle"
              style={{
                left: `${obstacle.x * tileSize}px`,
                top: `${obstacle.y * tileSize}px`,
                width: `${obstacle.width * tileSize}px`,
                height: `${obstacle.height * tileSize}px`,
              }}
            />
          ))}
        </div>

        <div className="vo-prop-layer" aria-hidden>
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
            className={`vo-agent-token ${selectedAgentId === agent.agentId ? 'vo-agent-selected' : ''} ${agent.isMoving ? 'vo-agent-moving' : ''}`}
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
            <span className="vo-agent-label">{agent.identity.callsign}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import type { OfficeAgentActivityState } from '../../types';
import { buildAgentSprite } from '../../lib/identity/profile';
import type { AgentIdentityProfile } from '../../../shared/types';

interface AgentSpriteProps {
  identity: AgentIdentityProfile;
  frame: number;
  activityState: OfficeAgentActivityState;
  selected?: boolean;
}

function activityClass(activityState: OfficeAgentActivityState): string {
  if (activityState === 'blocked') return 'sprite-activity-blocked';
  if (activityState === 'reviewing') return 'sprite-activity-reviewing';
  if (activityState === 'active') return 'sprite-activity-active';
  if (activityState === 'offline') return 'sprite-activity-offline';
  return 'sprite-activity-idle';
}

export function AgentSprite({ identity, frame, activityState, selected = false }: AgentSpriteProps) {
  const matrix = useMemo(() => buildAgentSprite(identity, Math.floor(frame)), [identity, frame]);

  return (
    <div className={`agent-sprite ${activityClass(activityState)} ${selected ? 'agent-sprite-selected' : ''}`}>
      <div
        className="agent-sprite-grid"
        style={{
          gridTemplateColumns: `repeat(${matrix.width}, 1fr)`,
        }}
      >
        {matrix.pixels.map((pixel, index) => (
          <span
            key={`${identity.seed}-${index}`}
            className="agent-sprite-pixel"
            style={{
              backgroundColor: pixel,
              opacity: pixel === 'transparent' ? 0 : 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}

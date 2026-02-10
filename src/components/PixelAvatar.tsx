import { useMemo } from 'react';
import type { AgentOfficeRole } from '../types';
import { buildAgentIdentity, buildAgentSprite } from '../lib/identity/profile';

interface PixelAvatarProps {
  seed: string;
  role: AgentOfficeRole;
  emoji: string;
  displayName?: string;
}

export function PixelAvatar({ seed, role, emoji, displayName }: PixelAvatarProps) {
  const identity = useMemo(() => buildAgentIdentity(seed, role, displayName ?? seed), [displayName, role, seed]);
  const sprite = useMemo(() => buildAgentSprite(identity, 1), [identity]);

  return (
    <div className="avatar-wrap">
      <div className="avatar-grid avatar-grid-16">
        {sprite.pixels.map((pixel, index) => (
          <div
            key={`${seed}-${index}`}
            className="avatar-pixel"
            style={{
              backgroundColor: pixel,
              opacity: pixel === 'transparent' ? 0 : 1,
            }}
          />
        ))}
      </div>
      <div className="avatar-emoji">{emoji}</div>
      <div className="avatar-callsign">{identity.callsign}</div>
    </div>
  );
}

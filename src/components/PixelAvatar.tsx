import { useMemo } from 'react';
import type { AgentOfficeRole } from '../types';

interface PixelAvatarProps {
  seed: string;
  role: AgentOfficeRole;
  emoji: string;
}

const rolePalette: Record<AgentOfficeRole, string[]> = {
  orchestrator: ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc'],
  planner: ['#0ea5e9', '#22d3ee', '#67e8f9', '#a5f3fc'],
  frontend: ['#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'],
  backend: ['#ea580c', '#f97316', '#fb923c', '#fdba74'],
  reviewer: ['#16a34a', '#22c55e', '#4ade80', '#86efac'],
  worker: ['#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'],
};

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRng(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function PixelAvatar({ seed, role, emoji }: PixelAvatarProps) {
  const palette = rolePalette[role];

  const pixels = useMemo(() => {
    const rng = makeRng(`${seed}-${role}`);
    const gridSize = 8;
    const half = gridSize / 2;
    const output: Array<{ on: boolean; color: string }> = [];

    for (let row = 0; row < gridSize; row += 1) {
      const left: Array<{ on: boolean; color: string }> = [];
      for (let col = 0; col < half; col += 1) {
        const intensity = rng();
        const on = intensity > 0.32;
        const color = palette[Math.floor(rng() * palette.length)] || palette[0];
        left.push({ on, color });
      }

      const right = [...left].reverse();
      output.push(...left, ...right);
    }

    return output;
  }, [palette, role, seed]);

  return (
    <div className="avatar-wrap">
      <div className="avatar-grid">
        {pixels.map((pixel, index) => (
          <div
            key={`${seed}-${index}`}
            className="avatar-pixel"
            style={{ backgroundColor: pixel.on ? pixel.color : 'rgba(100, 116, 139, 0.28)', opacity: pixel.on ? 1 : 0.2 }}
          />
        ))}
      </div>
      <div className="avatar-emoji">{emoji}</div>
    </div>
  );
}

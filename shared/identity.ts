import type { AgentIdentityProfile, AgentOfficeRole } from './types';

export interface PixelMatrix {
  width: number;
  height: number;
  pixels: string[];
}

const rolePalettes: Record<AgentOfficeRole, Array<{ key: string; base: string; accent: string; accessory: string }>> = {
  orchestrator: [
    { key: 'captain-indigo', base: '#6d7cff', accent: '#a8b4ff', accessory: '#f8fafc' },
    { key: 'vector-navy', base: '#4e67de', accent: '#83a3ff', accessory: '#dbeafe' },
  ],
  planner: [
    { key: 'cyan-grid', base: '#27b9df', accent: '#86ebff', accessory: '#d9faff' },
    { key: 'ice-map', base: '#0ea5e9', accent: '#67e8f9', accessory: '#cffafe' },
  ],
  frontend: [
    { key: 'mint-weave', base: '#15bfa0', accent: '#74f6d2', accessory: '#ddfff5' },
    { key: 'teal-bloom', base: '#0ea78a', accent: '#5eead4', accessory: '#e6fffa' },
  ],
  backend: [
    { key: 'ember-core', base: '#f37f34', accent: '#ffc48d', accessory: '#fff0de' },
    { key: 'forge-copper', base: '#d3661c', accent: '#fdba74', accessory: '#ffedd5' },
  ],
  reviewer: [
    { key: 'emerald-seal', base: '#24ad59', accent: '#87efad', accessory: '#eafff0' },
    { key: 'sage-guard', base: '#228d4d', accent: '#4ade80', accessory: '#dcfce7' },
  ],
  worker: [
    { key: 'steel-core', base: '#66758c', accent: '#c5d1e5', accessory: '#e2e8f0' },
    { key: 'slate-bot', base: '#536276', accent: '#94a3b8', accessory: '#dce3ed' },
  ],
};

const accessories: AgentIdentityProfile['accessory'][] = ['visor', 'headset', 'antenna', 'badge'];
const gaits: AgentIdentityProfile['gait'][] = ['steady', 'quick', 'drift'];
const traits: AgentIdentityProfile['trait'][] = ['calm', 'focused', 'bold', 'precise'];

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function makeRng(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function callsign(displayName: string, seed: string): string {
  const clean = displayName.replace(/[^a-zA-Z]/g, '').toUpperCase() || 'AGENT';
  const prefix = clean.slice(0, 3).padEnd(3, 'X');
  const suffix = (hashSeed(seed) % 900 + 100).toString();
  return `${prefix}-${suffix}`;
}

export function createAgentIdentityProfile(seed: string, role: AgentOfficeRole, displayName: string): AgentIdentityProfile {
  const rng = makeRng(`${seed}:${role}:profile`);
  const palettes = rolePalettes[role];
  const palette = palettes[Math.floor(rng() * palettes.length)] ?? palettes[0];

  return {
    seed,
    callsign: callsign(displayName, seed),
    paletteKey: palette.key,
    accentColor: palette.accent,
    baseColor: palette.base,
    accessoryColor: palette.accessory,
    accessory: accessories[Math.floor(rng() * accessories.length)] ?? 'badge',
    gait: gaits[Math.floor(rng() * gaits.length)] ?? 'steady',
    trait: traits[Math.floor(rng() * traits.length)] ?? 'focused',
  };
}

function setPixel(pixels: string[], width: number, x: number, y: number, value: string) {
  if (x < 0 || y < 0) return;
  if (x >= width) return;
  const index = y * width + x;
  if (index < 0 || index >= pixels.length) return;
  pixels[index] = value;
}

export function createAgentSpriteMatrix(profile: AgentIdentityProfile, frame = 0): PixelMatrix {
  const width = 16;
  const height = 16;
  const pixels = new Array<string>(width * height).fill('transparent');

  const skin = '#f5d1b5';
  const dark = '#122032';

  for (let y = 3; y <= 6; y += 1) {
    for (let x = 5; x <= 10; x += 1) {
      setPixel(pixels, width, x, y, skin);
    }
  }

  for (let y = 7; y <= 11; y += 1) {
    for (let x = 4; x <= 11; x += 1) {
      setPixel(pixels, width, x, y, profile.baseColor);
    }
  }

  for (let x = 4; x <= 11; x += 1) {
    setPixel(pixels, width, x, 8, profile.accentColor);
  }

  setPixel(pixels, width, 6, 4, dark);
  setPixel(pixels, width, 9, 4, dark);

  if (profile.accessory === 'visor') {
    for (let x = 5; x <= 10; x += 1) {
      setPixel(pixels, width, x, 2, profile.accessoryColor);
    }
  }
  if (profile.accessory === 'headset') {
    setPixel(pixels, width, 4, 4, profile.accessoryColor);
    setPixel(pixels, width, 11, 4, profile.accessoryColor);
  }
  if (profile.accessory === 'antenna') {
    setPixel(pixels, width, 8, 1, profile.accessoryColor);
    setPixel(pixels, width, 8, 0, profile.accentColor);
  }
  if (profile.accessory === 'badge') {
    setPixel(pixels, width, 10, 10, profile.accessoryColor);
  }

  const phase = frame % 4;
  const leftLeg = phase < 2 ? 6 : 5;
  const rightLeg = phase < 2 ? 9 : 10;

  for (let y = 12; y <= 14; y += 1) {
    setPixel(pixels, width, leftLeg, y, dark);
    setPixel(pixels, width, rightLeg, y, dark);
  }

  setPixel(pixels, width, 4, phase < 2 ? 9 : 10, dark);
  setPixel(pixels, width, 11, phase < 2 ? 10 : 9, dark);

  return { width, height, pixels };
}

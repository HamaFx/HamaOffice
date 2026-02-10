import type { AgentIdentityProfile, AgentOfficeRole } from '../../../shared/types';
import { createAgentIdentityProfile, createAgentSpriteMatrix } from '../../../shared/identity';

export function buildAgentIdentity(seed: string, role: AgentOfficeRole, displayName: string): AgentIdentityProfile {
  return createAgentIdentityProfile(seed, role, displayName);
}

export function buildAgentSprite(profile: AgentIdentityProfile, frame = 0) {
  return createAgentSpriteMatrix(profile, frame);
}

import { getOfficeStateEnvelope } from '../_lib/agentOffice.js';
import { hasReadAccess } from '../_lib/auth.js';
import { fail, forbidden, ok, tooManyRequests } from '../_lib/http.js';
import { limitReadRequest } from '../_lib/rateLimit.js';

export async function GET(request: Request) {
  if (!hasReadAccess(request)) {
    return forbidden('Agent Office read access denied');
  }

  const rate = await limitReadRequest(request);
  if (!rate.allowed) {
    return tooManyRequests(rate.resetAt);
  }

  try {
    const envelope = await getOfficeStateEnvelope();
    const sceneAgeMs = Date.now() - Date.parse(envelope.scene.generated_at);

    const syncStatus =
      sceneAgeMs <= envelope.scene.stale_after_ms
        ? 'live'
        : sceneAgeMs <= envelope.scene.stale_after_ms * 6
          ? 'stale'
          : 'offline';

    return ok(
      {
        workspace: envelope.workspace,
        scene: {
          ...envelope.scene,
          sync_status: syncStatus,
        },
      },
      {
        'x-rate-limit-remaining': String(rate.remaining),
      },
    );
  } catch (error) {
    return fail('Unable to read office state', 500, {
      message: error instanceof Error ? error.message : 'unknown',
    });
  }
}

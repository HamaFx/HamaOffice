import { buildOfficeSceneFromWorkspace } from '../_lib/agentOffice.js';
import { hasIngestAccess } from '../_lib/auth.js';
import { fail, forbidden, ok, tooManyRequests } from '../_lib/http.js';
import { limitIngestRequest } from '../_lib/rateLimit.js';
import {
  appendTimeline,
  getLatestScene,
  markIdempotencyKey,
  setLatestScene,
  setLatestWorkspace,
  writeEventHistory,
  writeSnapshotHistory,
} from '../_lib/storage.js';
import { ingestSnapshotSchema, parseJsonBody } from '../_lib/validation.js';

export async function POST(request: Request) {
  if (!hasIngestAccess(request)) {
    return forbidden('Agent Office ingest access denied');
  }

  const rate = await limitIngestRequest(request);
  if (!rate.allowed) {
    return tooManyRequests(rate.resetAt);
  }

  try {
    const payloadRaw = await parseJsonBody<unknown>(request, 1024 * 1024);
    const parsed = ingestSnapshotSchema.safeParse(payloadRaw);
    if (!parsed.success) {
      return fail('Invalid snapshot payload', 400, parsed.error.flatten());
    }

    const payload = parsed.data;
    const idempotency =
      request.headers.get('x-idempotency-key')?.trim() || `snapshot:${payload.generated_at}:${payload.source_host ?? 'unknown'}`;

    const fresh = await markIdempotencyKey(idempotency);
    if (!fresh) {
      return ok({ accepted: false, duplicate: true });
    }

    await setLatestWorkspace(payload.workspace);

    const previousScene = await getLatestScene();
    const scene = payload.scene ?? buildOfficeSceneFromWorkspace(payload.workspace, 'ingest', previousScene);

    await setLatestScene(scene);
    await appendTimeline(scene.events);
    await Promise.all([writeSnapshotHistory(scene), writeEventHistory(scene.events)]);

    return ok({
      accepted: true,
      generated_at: scene.generated_at,
      agents: scene.agents.length,
      sync_status: scene.sync_status,
      remaining: rate.remaining,
    });
  } catch (error) {
    return fail('Unable to ingest snapshot', 500, {
      message: error instanceof Error ? error.message : 'unknown',
    });
  }
}

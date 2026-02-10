import { hasIngestAccess } from '../_lib/auth.js';
import { fail, forbidden, ok, tooManyRequests } from '../_lib/http.js';
import { limitIngestRequest } from '../_lib/rateLimit.js';
import {
  appendTimeline,
  getLatestScene,
  markIdempotencyKey,
  setLatestScene,
  writeEventHistory,
} from '../_lib/storage.js';
import { ingestEventSchema, parseJsonBody } from '../_lib/validation.js';

export async function POST(request: Request) {
  if (!hasIngestAccess(request)) {
    return forbidden('Agent Office ingest access denied');
  }

  const rate = await limitIngestRequest(request);
  if (!rate.allowed) {
    return tooManyRequests(rate.resetAt);
  }

  try {
    const payloadRaw = await parseJsonBody<unknown>(request, 128 * 1024);
    const parsed = ingestEventSchema.safeParse(payloadRaw);
    if (!parsed.success) {
      return fail('Invalid event payload', 400, parsed.error.flatten());
    }

    const event = parsed.data.event;
    const idempotency = request.headers.get('x-idempotency-key')?.trim() || `event:${event.id}`;

    const fresh = await markIdempotencyKey(idempotency);
    if (!fresh) {
      return ok({ accepted: false, duplicate: true });
    }

    await appendTimeline([event]);
    await writeEventHistory([event]);

    const scene = await getLatestScene();
    if (scene) {
      const nextScene = {
        ...scene,
        events: [event, ...scene.events].slice(0, 40),
        alerts:
          event.severity === 'warning' || event.severity === 'critical'
            ? [
                {
                  id: `alert-${event.id}`,
                  severity: event.severity,
                  message: event.message,
                  createdAt: event.createdAt,
                  agentId: event.agentId,
                  taskId: event.taskId,
                },
                ...scene.alerts,
              ].slice(0, 24)
            : scene.alerts,
      };

      await setLatestScene(nextScene);
    }

    return ok({ accepted: true, id: event.id, remaining: rate.remaining });
  } catch (error) {
    return fail('Unable to ingest event', 500, {
      message: error instanceof Error ? error.message : 'unknown',
    });
  }
}

import { getOfficeStateEnvelope } from '../_lib/agentOffice.js';
import { hasReadAccess } from '../_lib/auth.js';
import { fail, forbidden, ok, tooManyRequests } from '../_lib/http.js';
import { limitReadRequest } from '../_lib/rateLimit.js';
import { getTimeline } from '../_lib/storage.js';
import { parseTimelineLimit } from '../_lib/validation.js';

export async function GET(request: Request) {
  if (!hasReadAccess(request)) {
    return forbidden('Agent Office read access denied');
  }

  const rate = await limitReadRequest(request);
  if (!rate.allowed) {
    return tooManyRequests(rate.resetAt);
  }

  try {
    const url = new URL(request.url);
    const limit = parseTimelineLimit(url);
    const events = await getTimeline(limit);

    if (events.length > 0) {
      return ok(
        {
          events,
          count: events.length,
          limit,
        },
        {
          'x-rate-limit-remaining': String(rate.remaining),
        },
      );
    }

    const envelope = await getOfficeStateEnvelope();
    const fallbackEvents = envelope.scene.events.slice(0, limit);

    return ok(
      {
        events: fallbackEvents,
        count: fallbackEvents.length,
        limit,
      },
      {
        'x-rate-limit-remaining': String(rate.remaining),
      },
    );
  } catch (error) {
    return fail('Unable to read office timeline', 500, {
      message: error instanceof Error ? error.message : 'unknown',
    });
  }
}

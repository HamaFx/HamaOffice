import { getAgentOfficeWorkspaceSnapshot } from './_lib/agentOffice.js';
import { fail, forbidden, ok, tooManyRequests } from './_lib/http.js';
import { hasReadAccess } from './_lib/auth.js';
import { limitReadRequest } from './_lib/rateLimit.js';

export async function GET(request: Request) {
  if (!hasReadAccess(request)) {
    return forbidden('Agent Office access denied');
  }

  const rate = await limitReadRequest(request);
  if (!rate.allowed) {
    return tooManyRequests(rate.resetAt);
  }

  try {
    const data = await getAgentOfficeWorkspaceSnapshot();
    return ok(data, {
      'x-rate-limit-remaining': String(rate.remaining),
    });
  } catch (error) {
    return fail('Unable to read workspace snapshot', 500, {
      message: error instanceof Error ? error.message : 'unknown',
    });
  }
}

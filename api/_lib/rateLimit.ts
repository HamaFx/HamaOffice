import { kv } from '@vercel/kv';

interface LimitConfig {
  limit: number;
  windowSec: number;
}

interface RateResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const fallbackWindows = new Map<string, { count: number; resetAt: number }>();

const readConfig: LimitConfig = {
  limit: Number(process.env.AGENT_OFFICE_READ_RATE_LIMIT ?? 180),
  windowSec: Number(process.env.AGENT_OFFICE_READ_RATE_WINDOW_SEC ?? 60),
};

const ingestConfig: LimitConfig = {
  limit: Number(process.env.AGENT_OFFICE_INGEST_RATE_LIMIT ?? 360),
  windowSec: Number(process.env.AGENT_OFFICE_INGEST_RATE_WINDOW_SEC ?? 60),
};

function normalizeClientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  const token = request.headers.get('x-agent-office-token') || request.headers.get('x-agent-office-ingest-token');
  if (token) return `token:${token.slice(0, 16)}`;
  return 'anonymous';
}

async function applyKvLimit(key: string, config: LimitConfig): Promise<RateResult> {
  const windowStart = Math.floor(Date.now() / 1000 / config.windowSec);
  const rateKey = `rate:${key}:${windowStart}`;

  const next = await kv.incr(rateKey);
  if (next === 1) {
    await kv.expire(rateKey, config.windowSec + 1);
  }

  const remaining = Math.max(0, config.limit - next);
  const resetAt = (windowStart + 1) * config.windowSec * 1000;
  return {
    allowed: next <= config.limit,
    remaining,
    resetAt,
  };
}

function applyFallbackLimit(key: string, config: LimitConfig): RateResult {
  const now = Date.now();
  const windowMs = config.windowSec * 1000;
  const current = fallbackWindows.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    fallbackWindows.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, config.limit - 1),
      resetAt,
    };
  }

  current.count += 1;
  const allowed = current.count <= config.limit;
  return {
    allowed,
    remaining: Math.max(0, config.limit - current.count),
    resetAt: current.resetAt,
  };
}

async function runLimit(request: Request, scope: 'read' | 'ingest'): Promise<RateResult> {
  const config = scope === 'read' ? readConfig : ingestConfig;
  const client = normalizeClientKey(request);
  const key = `${scope}:${client}`;

  try {
    return await applyKvLimit(key, config);
  } catch {
    return applyFallbackLimit(key, config);
  }
}

export async function limitReadRequest(request: Request): Promise<RateResult> {
  return runLimit(request, 'read');
}

export async function limitIngestRequest(request: Request): Promise<RateResult> {
  return runLimit(request, 'ingest');
}

export function __resetRateLimiterForTests() {
  fallbackWindows.clear();
}

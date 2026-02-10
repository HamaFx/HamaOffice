import { beforeEach, describe, expect, it } from 'vitest';
import { POST } from './snapshot';
import { __resetRateLimiterForTests } from '../_lib/rateLimit';
import { __resetStorageForTests, getLatestWorkspace } from '../_lib/storage';

function sampleWorkspace(now: string) {
  return {
    generated_at: now,
    sources: {
      openclaw_config: false,
      queue_state: false,
      telemetry: false,
    },
    agents: [],
    tasks: [],
    metrics: {
      total_tasks: 0,
      pass_rate: 0,
      status_counts: [],
      avg_lead_time_ms: 0,
      avg_attempts: 0,
      avg_review_loops: 0,
      total_cost_usd: 0,
      avg_cost_usd: 0,
      top_failure_causes: [],
    },
  };
}

describe('POST /api/ingest/snapshot', () => {
  beforeEach(() => {
    process.env.AGENT_OFFICE_INGEST_TOKEN = 'secret-ingest';
    __resetStorageForTests();
    __resetRateLimiterForTests();
  });

  it('rejects unauthorized ingest requests', async () => {
    const now = new Date('2026-02-10T00:00:00.000Z').toISOString();
    const request = new Request('http://localhost/api/ingest/snapshot', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        generated_at: now,
        workspace: sampleWorkspace(now),
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('validates payload shape', async () => {
    const request = new Request('http://localhost/api/ingest/snapshot', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-agent-office-ingest-token': 'secret-ingest',
      },
      body: JSON.stringify({ hello: 'world' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('accepts valid payload and stores workspace', async () => {
    const now = new Date('2026-02-10T00:00:00.000Z').toISOString();
    const request = new Request('http://localhost/api/ingest/snapshot', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-agent-office-ingest-token': 'secret-ingest',
        'x-idempotency-key': 'snapshot-key-1',
      },
      body: JSON.stringify({
        generated_at: now,
        workspace: sampleWorkspace(now),
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const stored = await getLatestWorkspace();
    expect(stored?.generated_at).toBe(now);
  });
});

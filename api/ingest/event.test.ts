import { beforeEach, describe, expect, it } from 'vitest';
import { POST } from './event';
import { __resetRateLimiterForTests } from '../_lib/rateLimit';
import { __resetStorageForTests, getTimeline } from '../_lib/storage';

describe('POST /api/ingest/event', () => {
  beforeEach(() => {
    process.env.AGENT_OFFICE_INGEST_TOKEN = 'secret-ingest';
    __resetStorageForTests();
    __resetRateLimiterForTests();
  });

  it('stores event and respects idempotency', async () => {
    const payload = {
      event: {
        id: 'event-1',
        type: 'task_progress',
        severity: 'info',
        message: 'agent-1 progressing task',
        createdAt: '2026-02-10T00:00:00.000Z',
        agentId: 'agent-1',
        taskId: 'task-1',
      },
    };

    const request = new Request('http://localhost/api/ingest/event', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-agent-office-ingest-token': 'secret-ingest',
        'x-idempotency-key': 'event-key-1',
      },
      body: JSON.stringify(payload),
    });

    const first = await POST(request);
    expect(first.status).toBe(200);

    const second = await POST(
      new Request('http://localhost/api/ingest/event', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-agent-office-ingest-token': 'secret-ingest',
          'x-idempotency-key': 'event-key-1',
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(second.status).toBe(200);

    const timeline = await getTimeline(20);
    expect(timeline.length).toBe(1);
    expect(timeline[0]?.id).toBe('event-1');
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { GET } from './state';
import { __resetRateLimiterForTests } from '../_lib/rateLimit';
import { __resetStorageForTests } from '../_lib/storage';

describe('GET /api/office/state', () => {
  beforeEach(() => {
    process.env.AGENT_OFFICE_READ_TOKEN = 'read-secret';
    __resetStorageForTests();
    __resetRateLimiterForTests();
  });

  it('requires read token when configured', async () => {
    const withoutToken = await GET(
      new Request('http://localhost/api/office/state', {
        method: 'GET',
      }),
    );

    expect(withoutToken.status).toBe(403);

    const withToken = await GET(
      new Request('http://localhost/api/office/state', {
        method: 'GET',
        headers: {
          'x-agent-office-token': 'read-secret',
        },
      }),
    );

    expect(withToken.status).toBe(200);
  });
});

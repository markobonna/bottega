import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { fail } from './api';
import { ProviderUnavailableError } from './meta';

describe('fail', () => {
  it('maps ProviderUnavailableError to 503 provider-off', async () => {
    const res = fail(new ProviderUnavailableError('open'));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'provider-off' });
  });
});

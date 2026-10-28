import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('server-only', () => ({}));

import { chat, config, json, MissingKeyError, ModelError } from './meta';

const ENV = ['MODEL_API_KEY', 'MODEL_API_BASE_URL', 'SPARK_MODEL'];
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
  process.env.MODEL_API_KEY = 'test-key';
  process.env.MODEL_API_BASE_URL = 'https://models.test/v1';
  process.env.SPARK_MODEL = 'muse-spark-1.3';
});

afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
});

function okFetch(content: string) {
  return vi.fn(async () =>
    ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) }),
  );
}

describe('meta', () => {
  it('missing key throws MissingKeyError', () => {
    delete process.env.MODEL_API_KEY;
    expect(() => config()).toThrow(MissingKeyError);
  });

  it('sends Authorization Bearer and the model id', async () => {
    const fetchMock = okFetch('hi');
    vi.stubGlobal('fetch', fetchMock);
    const out = await chat([{ role: 'user', content: 'hello' }]);
    expect(out).toBe('hi');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://models.test/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    expect(JSON.parse(init.body as string).model).toBe('muse-spark-1.3');
  });

  it('a 500 throws ModelError with the status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, text: async () => 'boom' })),
    );
    const err = await chat([{ role: 'user', content: 'hello' }]).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ModelError);
    expect((err as ModelError).status).toBe(500);
  });

  it('a 429 throws ModelError with the status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 429, text: async () => 'slow down' })),
    );
    const err = await chat([{ role: 'user', content: 'hello' }]).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ModelError);
    expect((err as ModelError).status).toBe(429);
  });

  it('json() rejects content that fails the Zod schema', async () => {
    vi.stubGlobal('fetch', okFetch(JSON.stringify({ wrong: 'shape' })));
    const err = await json([{ role: 'user', content: 'x' }], z.object({ n: z.number() })).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ModelError);
    expect((err as ModelError).message).toBe('bad json');
  });
});

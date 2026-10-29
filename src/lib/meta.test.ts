import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('server-only', () => ({}));

import {
  chat,
  config,
  json,
  jsonWithFallback,
  MissingKeyError,
  ModelError,
  ProviderUnavailableError,
} from './meta';

const ENV = [
  'MODEL_API_KEY',
  'MODEL_API_BASE_URL',
  'SPARK_MODEL',
  'OPEN_BASE_URL',
  'OPEN_API_KEY',
  'OPEN_MODEL',
  'LOCAL_BASE_URL',
  'LOCAL_MODEL',
];
let saved: Record<string, string | undefined>;

function setOpen() {
  process.env.OPEN_BASE_URL = 'https://open.test/v1';
  process.env.OPEN_API_KEY = 'fake-open-1';
  process.env.OPEN_MODEL = 'open-model';
}

function setLocal() {
  process.env.LOCAL_BASE_URL = 'http://localhost:11434/v1';
  process.env.LOCAL_MODEL = 'local-model';
}

beforeEach(() => {
  saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
  process.env.MODEL_API_KEY = 'test-key';
  process.env.MODEL_API_BASE_URL = 'https://models.test/v1';
  process.env.SPARK_MODEL = 'muse-spark-1.3';
  delete process.env.OPEN_BASE_URL;
  delete process.env.OPEN_API_KEY;
  delete process.env.OPEN_MODEL;
  delete process.env.LOCAL_BASE_URL;
  delete process.env.LOCAL_MODEL;
});

afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
});

function okFetch(content: string) {
  return vi.fn(async (..._args: unknown[]) => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  }));
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

  it("explicit 'open' uses the OPEN_* base, key and model", async () => {
    setOpen();
    const fetchMock = okFetch('hi');
    vi.stubGlobal('fetch', fetchMock);
    await chat([{ role: 'user', content: 'hello' }], { provider: 'open' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://open.test/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer fake-open-1');
    expect(JSON.parse(init.body as string).model).toBe('open-model');
  });

  it("explicit 'local' sends no Authorization header", async () => {
    setLocal();
    const fetchMock = okFetch('hi');
    vi.stubGlobal('fetch', fetchMock);
    await chat([{ role: 'user', content: 'hello' }], { provider: 'local' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/v1/chat/completions');
    expect(init.headers as Record<string, string>).not.toHaveProperty('Authorization');
    expect(JSON.parse(init.body as string).model).toBe('local-model');
  });

  it('missing open config throws ProviderUnavailableError without calling fetch', async () => {
    const fetchMock = okFetch('hi');
    vi.stubGlobal('fetch', fetchMock);
    const err = await chat([{ role: 'user', content: 'hello' }], { provider: 'open' }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ProviderUnavailableError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('{ private: true } uses local when set, else open', async () => {
    setOpen();
    setLocal();
    const fetchMock = okFetch('hi');
    vi.stubGlobal('fetch', fetchMock);
    await chat([{ role: 'user', content: 'hello' }], { private: true });
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:11434/v1/chat/completions');
    delete process.env.LOCAL_BASE_URL;
    delete process.env.LOCAL_MODEL;
    await chat([{ role: 'user', content: 'hello' }], { private: true });
    expect(fetchMock.mock.calls[1][0]).toBe('https://open.test/v1/chat/completions');
  });

  it('{ private: true } with nothing configured throws ProviderUnavailableError', async () => {
    const err = await chat([{ role: 'user', content: 'hello' }], { private: true }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ProviderUnavailableError);
  });

  it('non-meta providers get no response_format and a JSON-only instruction', async () => {
    setOpen();
    const fetchMock = okFetch(JSON.stringify({ n: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    await json(
      [
        { role: 'system', content: 'Be terse.' },
        { role: 'user', content: 'x' },
      ],
      z.object({ n: z.number() }),
      { provider: 'open' },
    );
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).not.toHaveProperty('response_format');
    expect(body.messages[0].content).toContain('Reply with only JSON');
  });

  it('meta keeps json_schema structured output', async () => {
    const fetchMock = okFetch(JSON.stringify({ n: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    await json([{ role: 'user', content: 'x' }], z.object({ n: z.number() }));
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.response_format.type).toBe('json_schema');
  });

  it('jsonWithFallback retries a 500 on open and reports via', async () => {
    setOpen();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'bad' })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({ n: 2 }) } }] }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const out = await jsonWithFallback([{ role: 'user', content: 'x' }], z.object({ n: z.number() }));
    expect(out).toEqual({ data: { n: 2 }, via: 'open' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://models.test/v1/chat/completions');
    expect(fetchMock.mock.calls[1][0]).toBe('https://open.test/v1/chat/completions');
  });

  it('jsonWithFallback retries with the open model, not the caller model', async () => {
    setOpen();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'slow' })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({ n: 3 }) } }] }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const out = await jsonWithFallback([{ role: 'user', content: 'x' }], z.object({ n: z.number() }), {
      model: 'muse-wonder-1.0',
    });
    expect(out.via).toBe('open');
    const bodies = fetchMock.mock.calls.map(([_, init]) =>
      JSON.parse((init as RequestInit).body as string),
    );
    expect(bodies[0].model).toBe('muse-wonder-1.0');
    expect(bodies[1].model).toBe('open-model');
  });

  it('jsonWithFallback does not retry a 400', async () => {
    setOpen();
    const fetchMock = vi.fn(async () => ({ ok: false, status: 400, text: async () => 'bad' }));
    vi.stubGlobal('fetch', fetchMock);
    const err = await jsonWithFallback([{ role: 'user', content: 'x' }], z.object({ n: z.number() })).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ModelError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('jsonWithFallback does not retry a missing key', async () => {
    setOpen();
    delete process.env.MODEL_API_KEY;
    const fetchMock = okFetch(JSON.stringify({ n: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    const err = await jsonWithFallback([{ role: 'user', content: 'x' }], z.object({ n: z.number() })).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(MissingKeyError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

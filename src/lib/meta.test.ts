import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('server-only', () => ({}));

import {
  chat,
  config,
  editImage,
  json,
  jsonWithFallback,
  MissingKeyError,
  ModelError,
  ProviderUnavailableError,
  sniffImageFormat,
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

  it("finish_reason 'length' throws a cut-off ModelError", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"files":[' }, finish_reason: 'length' }],
        }),
      })),
    );
    const err = await chat([{ role: 'user', content: 'hello' }]).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ModelError);
    expect((err as ModelError).message).toMatch(/^cut off/);
  });

  it("a TimeoutError abort becomes ModelError 504 (falls back like a 5xx)", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const e = new Error("The operation was aborted due to timeout");
        e.name = "TimeoutError";
        throw e;
      }),
    );
    const err = await chat([{ role: 'user', content: 'hello' }]).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ModelError);
    expect((err as ModelError).status).toBe(504);
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

  it('a first-attempt 404 is retried once and success is returned', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'flaked' })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: 'hi' } }] }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const out = await chat([{ role: 'user', content: 'hello' }]);
    expect(out).toBe('hi');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('two 404s in a row throw ModelError 404', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 404, text: async () => 'nope' }));
    vi.stubGlobal('fetch', fetchMock);
    const err = await chat([{ role: 'user', content: 'hello' }]).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ModelError);
    expect((err as ModelError).status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(2);
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

  it('editImage posts multipart to /images/edits and decodes b64', async () => {
    const png = Buffer.from('fakepng').toString('base64');
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ b64_json: png }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await editImage('make it real', new Uint8Array([1, 2, 3]), '1536x1024');
    expect(Buffer.from(out).toString()).toBe('fakepng');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://models.test/v1/images/edits');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    const form = init.body as FormData;
    expect(form.get('model')).toBe('muse-image-1.0');
    expect(form.get('prompt')).toBe('make it real');
    expect(form.get('size')).toBe('1536x1024');
    expect(form.get('n')).toBe('1');
    expect((form.get('image') as Blob).size).toBe(3);
  });

  it('sniffImageFormat reads magic bytes, png fallback', () => {
    expect(
      sniffImageFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d])),
    ).toEqual({ mime: 'image/png', ext: 'png' });
    expect(sniffImageFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toEqual(
      { mime: 'image/jpeg', ext: 'jpg' },
    );
    expect(
      sniffImageFormat(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42,
          0x50,
        ]),
      ),
    ).toEqual({ mime: 'image/webp', ext: 'webp' });
    expect(sniffImageFormat(new Uint8Array([1, 2, 3]))).toEqual({
      mime: 'image/png',
      ext: 'png',
    });
  });

  it('editImage declares the sniffed webp type', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ b64_json: 'eA==' }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    await editImage('make it real', webp as Uint8Array<ArrayBuffer>);
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const file = (init.body as FormData).get('image') as File;
    expect(file.type).toBe('image/webp');
    expect(file.name).toBe('source.webp');
  });

  it('editImage throws MissingKeyError without a key', async () => {
    delete process.env.MODEL_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(editImage('x', new Uint8Array([1]))).rejects.toBeInstanceOf(MissingKeyError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

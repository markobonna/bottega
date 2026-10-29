import 'server-only';

import { z } from 'zod';

export class MissingKeyError extends Error {
  constructor() {
    super('MODEL_API_KEY is not set');
    this.name = 'MissingKeyError';
  }
}

export type Provider = 'meta' | 'open' | 'local';

export class ProviderUnavailableError extends Error {
  provider: Provider;
  constructor(provider: Provider) {
    super(`provider '${provider}' is not configured`);
    this.name = 'ProviderUnavailableError';
    this.provider = provider;
  }
}

export class ModelError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(detail.slice(0, 300));
    this.name = 'ModelError';
    this.status = status;
  }
}

export interface MetaConfig {
  key: string;
  base: string;
  spark: string;
  wonder: string;
  image: string;
  voice: string;
  sam: string;
}

export function config(): MetaConfig {
  const key = process.env.MODEL_API_KEY ?? '';
  if (!key) throw new MissingKeyError();
  return {
    key,
    base: (process.env.MODEL_API_BASE_URL || 'https://api.meta.ai/v1').replace(/\/+$/, ''),
    spark: process.env.SPARK_MODEL || 'muse-spark-1.3-contributor',
    wonder: process.env.WONDER_MODEL || 'muse-wonder-1.0',
    image: process.env.IMAGE_MODEL || 'muse-image-1.0',
    voice: process.env.VOICE_MODEL || 'muse-voice-transcribe-1.0',
    sam: process.env.SAM_MODEL || '',
  };
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface MetaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface CallOpts {
  model?: string;
  maxTokens?: number;
  schema?: Record<string, unknown>;
  reasoning?: string;
  timeoutMs?: number;
  provider?: Provider;
  private?: boolean;
}

interface ChatTarget {
  provider: Provider;
  base: string;
  key: string | null;
  model: string;
}

// Explicit provider wins; otherwise { private: true } uses 'local' when a
// local endpoint is set, else 'open'. Anything else is 'meta'.
function resolveTarget(opts: {
  provider?: Provider;
  private?: boolean;
  model?: string;
}): ChatTarget {
  const localBase = process.env.LOCAL_BASE_URL || '';
  const name: Provider =
    opts.provider ??
    (opts.private === true ? (localBase ? 'local' : 'open') : 'meta');
  if (name === 'open') {
    const base = process.env.OPEN_BASE_URL || '';
    const key = process.env.OPEN_API_KEY || '';
    const model = opts.model || process.env.OPEN_MODEL || '';
    if (!base || !key || !model) throw new ProviderUnavailableError('open');
    return { provider: name, base: base.replace(/\/+$/, ''), key, model };
  }
  if (name === 'local') {
    const model = opts.model || process.env.LOCAL_MODEL || '';
    if (!localBase || !model) throw new ProviderUnavailableError('local');
    return {
      provider: name,
      base: localBase.replace(/\/+$/, ''),
      key: null,
      model,
    };
  }
  const cfg = config();
  return {
    provider: name,
    base: cfg.base,
    key: cfg.key,
    model: opts.model ?? cfg.spark,
  };
}

async function request(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new ModelError(504, 'timed out');
    throw e;
  }
  if (!res.ok) throw new ModelError(res.status, await res.text());
  return res;
}

const JSON_ONLY = 'Reply with only JSON, no other text.';

// Open-weight endpoints take no json_schema (proven 400 on Fireworks), so a
// schema there becomes a plain instruction. Zod stays the real gate.
function withJsonInstruction(messages: MetaMessage[]): MetaMessage[] {
  const [first, ...rest] = messages;
  if (first && first.role === 'system' && typeof first.content === 'string') {
    return [{ ...first, content: `${first.content}\n\n${JSON_ONLY}` }, ...rest];
  }
  return [{ role: 'system', content: JSON_ONLY }, ...messages];
}

export async function chat(
  messages: MetaMessage[],
  {
    model,
    maxTokens = 800,
    schema,
    reasoning = 'low',
    timeoutMs = 30000,
    provider,
    private: priv,
  }: CallOpts = {},
): Promise<string> {
  const target = resolveTarget({ provider, private: priv, model });
  if (schema && schema.type !== 'object') throw new Error('schema root must be an object');
  const useSchema = schema && target.provider === 'meta';
  const res = await request(
    `${target.base}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(target.key ? { Authorization: `Bearer ${target.key}` } : {}),
      },
      body: JSON.stringify({
        model: target.model,
        messages: schema && !useSchema ? withJsonInstruction(messages) : messages,
        max_tokens: maxTokens,
        reasoning_effort: reasoning,
        ...(useSchema
          ? { response_format: { type: 'json_schema', json_schema: { name: 'reply', schema } } }
          : {}),
      }),
    },
    timeoutMs,
  );
  const json = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content) throw new ModelError(502, 'empty reply');
  console.log(`[bottega] chat via ${target.provider} (${target.model})`);
  return content;
}

export async function json<T>(
  messages: MetaMessage[],
  zodSchema: z.ZodType<T>,
  opts: CallOpts = {},
): Promise<T> {
  const content = await chat(messages, {
    ...opts,
    schema: z.toJSONSchema(zodSchema) as Record<string, unknown>,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new ModelError(502, 'bad json');
  }
  const result = zodSchema.safeParse(parsed);
  if (!result.success) throw new ModelError(502, 'bad json');
  return result.data;
}

export function isOpenConfigured(): boolean {
  return Boolean(
    process.env.OPEN_BASE_URL &&
      process.env.OPEN_API_KEY &&
      process.env.OPEN_MODEL,
  );
}

// Try Meta, then retry once on 'open' for 429/5xx (never 400, never a missing
// key). Reports which provider answered.
export async function jsonWithFallback<T>(
  messages: MetaMessage[],
  zodSchema: z.ZodType<T>,
  opts: CallOpts = {},
): Promise<{ data: T; via: 'meta' | 'open' }> {
  try {
    return { data: await json(messages, zodSchema, opts), via: 'meta' };
  } catch (e) {
    if (
      e instanceof ModelError &&
      (e.status === 429 || e.status >= 500) &&
      isOpenConfigured()
    ) {
      // The caller's model id is Meta's; drop it so OPEN_MODEL applies.
      const { model: _ignored, ...openOpts } = opts;
      const data = await json(messages, zodSchema, { ...openOpts, provider: 'open' });
      return { data, via: 'open' };
    }
    throw e;
  }
}

export async function postJson(
  path: string,
  body: unknown,
  timeoutMs = 30000,
  _opts: { private?: boolean } = {},
): Promise<Response> {
  const cfg = config();
  return request(
    `${cfg.base}${path}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );
}

export async function postForm(
  path: string,
  form: FormData,
  timeoutMs = 30000,
  _opts: { private?: boolean } = {},
  headers: Record<string, string> = {},
): Promise<Response> {
  const cfg = config();
  return request(
    `${cfg.base}${path}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.key}`, ...headers },
      body: form,
    },
    timeoutMs,
  );
}

export async function transcribe(
  wavBytes: Uint8Array<ArrayBuffer>,
  timeoutMs = 30000,
): Promise<string> {
  const cfg = config();
  const form = new FormData();
  form.append(
    'request',
    new Blob(
      [
        JSON.stringify({
          model: cfg.voice,
          audioEncoding: 'WAV',
          mode: 'PUSH_TO_TALK',
        }),
      ],
      { type: 'application/json' },
    ),
  );
  form.append('audio', new Blob([wavBytes], { type: 'audio/wav' }), 'audio.wav');
  const res = await postForm('/asr/transcribe', form, timeoutMs, {}, {
    Accept: 'application/json',
  });
  const body = (await res.json()) as { transcript?: unknown };
  if (typeof body.transcript !== 'string' || body.transcript === '') {
    throw new ModelError(502, 'empty transcript');
  }
  return body.transcript;
}

export async function image(
  prompt: string,
  timeoutMs = 55000,
): Promise<Uint8Array> {
  const cfg = config();
  const res = await postJson(
    '/images/generations',
    {
      model: cfg.image,
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    },
    timeoutMs,
  );
  const body = (await res.json()) as {
    data?: { b64_json?: unknown; url?: unknown }[];
  };
  const first = body.data?.[0];
  if (typeof first?.b64_json === 'string' && first.b64_json !== '') {
    return Uint8Array.from(Buffer.from(first.b64_json, 'base64'));
  }
  if (typeof first?.url === 'string' && first.url !== '') {
    const dl = await request(first.url, {}, timeoutMs);
    return new Uint8Array(await dl.arrayBuffer());
  }
  throw new ModelError(502, 'empty image');
}

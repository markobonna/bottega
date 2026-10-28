import 'server-only';

import { z } from 'zod';

export class MissingKeyError extends Error {
  constructor() {
    super('MODEL_API_KEY is not set');
    this.name = 'MissingKeyError';
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

export interface MetaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CallOpts {
  model?: string;
  maxTokens?: number;
  schema?: Record<string, unknown>;
  reasoning?: string;
  timeoutMs?: number;
  private?: boolean;
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

export async function chat(
  messages: MetaMessage[],
  { model, maxTokens = 800, schema, reasoning = 'low', timeoutMs = 30000 }: CallOpts = {},
): Promise<string> {
  const cfg = config();
  if (schema && schema.type !== 'object') throw new Error('schema root must be an object');
  const res = await request(
    `${cfg.base}/chat/completions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: model ?? cfg.spark,
        messages,
        max_tokens: maxTokens,
        reasoning_effort: reasoning,
        ...(schema
          ? { response_format: { type: 'json_schema', json_schema: { name: 'reply', schema } } }
          : {}),
      }),
    },
    timeoutMs,
  );
  const json = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content) throw new ModelError(502, 'empty reply');
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

import { createHash } from 'node:crypto';

import { z } from 'zod';

import { MissingKeyError, ModelError, ProviderUnavailableError } from '@/lib/meta';
import { createClient } from '@/lib/supabase/server';

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in required.' }, { status: 401 });
  return { supabase, user };
}

export function fail(e: unknown): Response {
  if (e instanceof MissingKeyError) return Response.json({ error: 'off' }, { status: 503 });
  if (e instanceof ProviderUnavailableError)
    return Response.json({ error: 'provider-off' }, { status: 503 });
  console.error(e instanceof ModelError ? e.message : e);
  // Self-reporting errors: the label names the exact call (model + host),
  // the key hash is irreversible (compare: grep '^MODEL_API_KEY='
  // .env.local | cut -d= -f2- | tr -d '\n"' | shasum). Safe to show.
  let label = 'unknown call';
  if (e instanceof ModelError) {
    const m = e.message.match(/^\[(.*?)\]/);
    if (m) label = m[1];
  }
  const key = process.env.MODEL_API_KEY ?? '';
  const sha = key
    ? createHash('sha256').update(key).digest('hex').slice(0, 12)
    : 'none';
  console.error(`[bottega] model key sha12=${sha} len=${key.length}`);
  const diag = `${label} · key ${sha}`;
  if (e instanceof ModelError && e.message.startsWith('cut off'))
    return Response.json(
      { error: `The design was cut off before it finished. Try again. (${diag})` },
      { status: 502 },
    );
  // Distinct causes, distinct messages: a rate limit is "wait", a timeout
  // is "retry", a 404 is config. Collapsing them cost us a full saga.
  if (e instanceof ModelError && e.status === 429)
    return Response.json(
      { error: `The model is rate-limited right now. Wait a minute, then try again. (${diag})`, status: 429 },
      { status: 502 },
    );
  if (e instanceof ModelError && e.status === 404)
    return Response.json(
      { error: `The model id was not found. Check the model env vars. (${diag})`, status: 404 },
      { status: 502 },
    );
  if (e instanceof ModelError && (e.status === 504 || e.message.includes('timed out')))
    return Response.json(
      { error: `The model timed out. Try again. (${diag})`, status: 504 },
      { status: 502 },
    );
  return Response.json(
    {
      error: `The model didn't answer. Try again. (${diag})`,
      ...(e instanceof ModelError ? { status: e.status } : {}),
    },
    { status: 502 },
  );
}

export async function readJson<T>(req: Request, zodSchema: z.ZodType<T>): Promise<T | Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  const result = zodSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.issues[0]?.message ?? 'Invalid input.' }, { status: 400 });
  }
  return result.data;
}

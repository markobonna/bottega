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
  if (e instanceof ModelError && e.message.startsWith('cut off'))
    return Response.json(
      { error: 'The design was cut off before it finished. Try again.' },
      { status: 502 },
    );
  // Distinct causes, distinct messages: a rate limit is "wait", a timeout
  // is "retry", a 404 is config. Collapsing them cost us a full saga.
  if (e instanceof ModelError && e.status === 429)
    return Response.json(
      { error: 'The model is rate-limited right now. Wait a minute, then try again.', status: 429 },
      { status: 502 },
    );
  if (e instanceof ModelError && e.status === 404)
    return Response.json(
      { error: 'The model id was not found. Check the model env vars.', status: 404 },
      { status: 502 },
    );
  if (e instanceof ModelError && (e.status === 504 || e.message === 'timed out'))
    return Response.json(
      { error: 'The model timed out. Try again.', status: 504 },
      { status: 502 },
    );
  return Response.json(
    {
      error: "The model didn't answer. Try again.",
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

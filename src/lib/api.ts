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
  return Response.json({ error: "The model didn't answer. Try again." }, { status: 502 });
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

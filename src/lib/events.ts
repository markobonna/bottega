import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "./supabase/types";

// Usage events for Muse Wonder suggestions. Callers pass only spec-derived
// ids and counts — never user free text.

type Client = SupabaseClient<Database>;

export async function logEvent(
  client: Client,
  appId: string,
  kind: string,
  detail: Json,
): Promise<void> {
  const { error } = await client
    .from("events")
    .insert({ app_id: appId, kind, detail });
  if (error) throw new Error(error.message);
}

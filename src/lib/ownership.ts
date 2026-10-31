import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./supabase/types";

// Explicit ownership checks. RLS still blocks cross-owner writes, but since
// demo templates are world-readable, "I could read it" no longer proves "I
// own it" — every mutation path must verify ownership itself, and every
// user-facing list must filter by owner. Failures reuse the not-found
// wording so callers can't distinguish "foreign" from "missing".

type Client = SupabaseClient<Database>;

async function sessionUid(client: Client): Promise<string | null> {
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}

async function ownerOf(
  client: Client,
  table: "apps" | "workshops" | "models" | "examples",
  id: string,
): Promise<string | null> {
  const { data, error } = await client
    .from(table)
    .select("owner")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data.owner;
}

/** Throw unless the session (or asserted owner) owns the app. */
export async function needApp(
  client: Client,
  appId: string,
  owner?: string,
): Promise<string> {
  const uid = owner ?? (await sessionUid(client));
  const actual = await ownerOf(client, "apps", appId);
  if (!uid || !actual || actual !== uid) throw new Error(`no app '${appId}'`);
  return uid;
}

/** Throw unless the session (or asserted owner) owns the workshop. */
export async function needWorkshop(
  client: Client,
  workshopId: string,
  owner?: string,
): Promise<string> {
  const uid = owner ?? (await sessionUid(client));
  const actual = await ownerOf(client, "workshops", workshopId);
  if (!uid || !actual || actual !== uid) {
    throw new Error("No such workshop.");
  }
  return uid;
}

/** Throw unless the session owns the teach model. */
export async function needModel(
  client: Client,
  modelId: string,
): Promise<string> {
  const uid = await sessionUid(client);
  const actual = await ownerOf(client, "models", modelId);
  if (!uid || !actual || actual !== uid) {
    throw new Error(`no model '${modelId}'`);
  }
  return uid;
}

/** Throw unless the session owns the teach example. */
export async function needExample(
  client: Client,
  exampleId: string,
): Promise<string> {
  const uid = await sessionUid(client);
  const actual = await ownerOf(client, "examples", exampleId);
  if (!uid || !actual || actual !== uid) {
    throw new Error(`no example '${exampleId}'`);
  }
  return uid;
}

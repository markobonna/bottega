import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { needApp } from "./ownership";
import type { Collection } from "./spec/schema";
import type { Database } from "./supabase/types";
import { checkValues } from "./values";

export { checkValues };
export type { CheckResult } from "./values";

// Record CRUD. Every function takes the caller's own client (server actions
// pass the cookie-based one, scripts their signed-in one), so RLS always
// applies. This module never imports the admin client.

type Client = SupabaseClient<Database>;
export type DbRecord = Database["public"]["Tables"]["records"]["Row"];

async function loadSpec(client: Client, appId: string) {
  const { data, error } = await client
    .from("apps")
    .select("spec")
    .eq("id", appId)
    .single();
  if (error || !data) throw new Error(`no app '${appId}'`);
  const spec = data.spec as unknown as {
    collections: Collection[];
  };
  return spec;
}

async function needCollection(
  client: Client,
  appId: string,
  collection: string,
): Promise<Collection> {
  await needApp(client, appId);
  const spec = await loadSpec(client, appId);
  const coll = spec.collections.find((c) => c.id === collection);
  if (!coll) throw new Error(`no collection '${collection}' in app`);
  return coll;
}

function failChecked(
  collection: string,
  checked: { ok: boolean; issues: string[] },
): void {
  if (!checked.ok) {
    throw new Error(
      `bad values for '${collection}': ${checked.issues.join("; ")}`,
    );
  }
}

export async function listRecords(
  client: Client,
  appId: string,
  collection: string,
  opts?: { limit?: number },
): Promise<DbRecord[]> {
  await needApp(client, appId);
  const { data, error } = await client
    .from("records")
    .select("*")
    .eq("app_id", appId)
    .eq("collection", collection)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 100);
  if (error) throw new Error(error.message);
  return data;
}

export async function addRecord(
  client: Client,
  appId: string,
  collection: string,
  data: Record<string, unknown>,
): Promise<DbRecord> {
  const coll = await needCollection(client, appId, collection);
  const checked = checkValues(coll, data);
  failChecked(collection, checked);
  const { data: row, error } = await client
    .from("records")
    .insert({ app_id: appId, collection, data: checked.data })
    .select()
    .single();
  if (error || !row) throw new Error(error?.message ?? "insert failed");
  return row;
}

export async function updateRecord(
  client: Client,
  id: string,
  data: Record<string, unknown>,
): Promise<DbRecord> {
  const { data: existing, error: findError } = await client
    .from("records")
    .select("app_id, collection, data")
    .eq("id", id)
    .single();
  if (findError || !existing) throw new Error(`no record '${id}'`);
  if (!existing.app_id || !existing.collection) {
    throw new Error(`record '${id}' is orphaned`);
  }
  const coll = await needCollection(client, existing.app_id, existing.collection);
  const checked = checkValues(coll, data);
  failChecked(existing.collection, checked);
  const merged = {
    ...((existing.data as Record<string, string | number | boolean> | null) ??
      {}),
    ...checked.data,
  };
  const { data: row, error } = await client
    .from("records")
    .update({ data: merged })
    .eq("id", id)
    .select()
    .single();
  if (error || !row) throw new Error(error?.message ?? "update failed");
  return row;
}

export async function deleteRecord(
  client: Client,
  id: string,
): Promise<{ id: string }> {
  const { data, error } = await client
    .from("records")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error(`no record '${id}'`);
  return { id };
}

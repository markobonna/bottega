import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { applyOps, type Op } from "./spec/ops";
import { parseSpec, type AppSpec } from "./spec/schema";
import type { Database } from "./supabase/types";

// Versioned app storage. Client-first like records.ts so the seed script can
// reuse these with the admin client (passing owner explicitly, since the
// auth.uid() column default is null for admin writes).

type Client = SupabaseClient<Database>;

export type VersionSource = "build" | "edit" | "suggest" | "inline";

type WithOwner = { owner?: string };

export async function createApp(
  client: Client,
  spec: unknown,
  opts: { source: VersionSource; summary: string } & WithOwner,
): Promise<string> {
  const parsed = parseSpec(spec);
  if (!parsed.ok) {
    throw new Error(`bad spec: ${parsed.issues.join("; ")}`);
  }
  const clean: AppSpec = parsed.spec;
  const owned = opts.owner !== undefined ? { owner: opts.owner } : {};
  const { data: app, error: appError } = await client
    .from("apps")
    .insert({ name: clean.name, spec: clean, version: 1, ...owned })
    .select("id")
    .single();
  if (appError || !app) throw new Error(appError?.message ?? "insert failed");
  const { error: verError } = await client.from("app_versions").insert({
    app_id: app.id,
    version: 1,
    spec: clean,
    ops: [],
    summary: opts.summary,
    source: opts.source,
    ...owned,
  });
  if (verError) throw new Error(verError.message);
  return app.id;
}

export type SaveResult = { conflict: true } | { version: number };

export async function saveVersion(
  client: Client,
  appId: string,
  baseVersion: number,
  ops: Op[],
  opts: { source: VersionSource; summary: string },
): Promise<SaveResult> {
  const { data: app, error } = await client
    .from("apps")
    .select("id, version, spec")
    .eq("id", appId)
    .single();
  if (error || !app) throw new Error(`no app '${appId}'`);
  if (app.version !== baseVersion) return { conflict: true };
  const applied = applyOps(app.spec as unknown as AppSpec, ops);
  if (!applied.ok) {
    throw new Error(`bad edit: ${applied.issues.join("; ")}`);
  }
  const version = baseVersion + 1;
  const { error: upError } = await client
    .from("apps")
    .update({
      spec: applied.spec,
      version,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appId);
  if (upError) throw new Error(upError.message);
  const { error: verError } = await client.from("app_versions").insert({
    app_id: appId,
    version,
    spec: applied.spec,
    ops: ops as unknown as Database["public"]["Tables"]["app_versions"]["Insert"]["ops"],
    summary: opts.summary,
    source: opts.source,
  });
  if (verError) throw new Error(verError.message);
  return { version };
}

export async function restorePrevious(
  client: Client,
  appId: string,
): Promise<{ version: number }> {
  const { data: app, error } = await client
    .from("apps")
    .select("id, version")
    .eq("id", appId)
    .single();
  if (error || !app) throw new Error(`no app '${appId}'`);
  const { data: rows, error: rowsError } = await client
    .from("app_versions")
    .select("version, spec, summary")
    .eq("app_id", appId)
    .order("version", { ascending: false })
    .limit(2);
  if (rowsError) throw new Error(rowsError.message);
  const [current, previous] = rows ?? [];
  if (!current || !previous) throw new Error("nothing to undo");
  const version = app.version + 1;
  const summary = `Undid: ${current.summary ?? "last change"}`;
  const { error: upError } = await client
    .from("apps")
    .update({
      spec: previous.spec,
      version,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appId);
  if (upError) throw new Error(upError.message);
  const { error: verError } = await client.from("app_versions").insert({
    app_id: appId,
    version,
    spec: previous.spec,
    ops: [],
    summary,
    source: "edit",
  });
  if (verError) throw new Error(verError.message);
  return { version };
}

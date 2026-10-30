"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  effectiveStage,
  isMediumId,
  nextStage,
  type DesignMedium,
} from "@/lib/design/project-art";
import { signedUrls } from "@/lib/media";
import {
  addRecord,
  deleteRecord,
  listRecords,
  updateRecord,
  type DbRecord,
} from "@/lib/records";
import type { Op } from "@/lib/spec/ops";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { listVersions, saveVersion, type VersionRow } from "@/lib/versions";
import { logEvent as writeEvent } from "@/lib/events";

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; error: string };

function fail(e: unknown): Fail {
  return {
    ok: false,
    error: e instanceof Error ? e.message : "Something went wrong.",
  };
}

export async function getRecords(
  appId: string,
  collection: string,
): Promise<Ok<{ rows: DbRecord[] }> | Fail> {
  try {
    const supabase = await createClient();
    const rows = await listRecords(supabase, appId, collection);
    return { ok: true, rows };
  } catch (e) {
    return fail(e);
  }
}

export async function createRecord(
  appId: string,
  collection: string,
  data: Record<string, unknown>,
): Promise<Ok<{ row: DbRecord }> | Fail> {
  try {
    const supabase = await createClient();
    const row = await addRecord(supabase, appId, collection, data);
    revalidatePath(`/projects/${appId}`);
    return { ok: true, row };
  } catch (e) {
    return fail(e);
  }
}

export async function saveRecord(
  appId: string,
  id: string,
  data: Record<string, unknown>,
): Promise<Ok<{ row: DbRecord }> | Fail> {
  try {
    const supabase = await createClient();
    const row = await updateRecord(supabase, id, data);
    revalidatePath(`/projects/${appId}`);
    return { ok: true, row };
  } catch (e) {
    return fail(e);
  }
}

export async function signPhotoPaths(
  paths: string[],
): Promise<Ok<{ urls: Record<string, string> }> | Fail> {
  try {
    const supabase = await createClient();
    const urls = await signedUrls(supabase, paths);
    return { ok: true, urls };
  } catch (e) {
    return fail(e);
  }
}

export async function removeRecord(
  appId: string,
  id: string,
): Promise<Ok<{ id: string }> | Fail> {
  try {
    const supabase = await createClient();
    const gone = await deleteRecord(supabase, id);
    revalidatePath(`/projects/${appId}`);
    return { ok: true, ...gone };
  } catch (e) {
    return fail(e);
  }
}

export async function saveBlockLines(
  appId: string,
  baseVersion: number,
  blockId: string,
  lines: unknown,
  summary: string,
): Promise<Ok<{ conflict: boolean }> | Fail> {
  try {
    const supabase = await createClient();
    const op: Op = { op: "updateBlock", id: blockId, set: { lines } };
    const result = await saveVersion(supabase, appId, baseVersion, [op], {
      source: "inline",
      summary,
    });
    if ("conflict" in result) return { ok: true, conflict: true };
    revalidatePath(`/projects/${appId}`);
    return { ok: true, conflict: false };
  } catch (e) {
    return fail(e);
  }
}

export async function getOrCreateShare(
  appId: string,
  recordId: string,
): Promise<Ok<{ token: string }> | Fail> {
  try {
    const supabase = await createClient();
    const { data: existing, error: findError } = await supabase
      .from("shares")
      .select("token")
      .eq("app_id", appId)
      .eq("record_id", recordId)
      .eq("revoked", false)
      .maybeSingle();
    if (findError) throw new Error(findError.message);
    if (existing) return { ok: true, token: existing.token };
    const token = randomBytes(24).toString("base64url");
    const { error: insertError } = await supabase
      .from("shares")
      .insert({ app_id: appId, record_id: recordId, token });
    if (insertError) throw new Error(insertError.message);
    return { ok: true, token };
  } catch (e) {
    return fail(e);
  }
}

export async function revokeShare(
  token: string,
): Promise<Ok<{ revoked: true }> | Fail> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("shares")
      .update({ revoked: true })
      .eq("token", token);
    if (error) throw new Error(error.message);
    return { ok: true, revoked: true };
  } catch (e) {
    return fail(e);
  }
}

export async function getVersions(
  appId: string,
): Promise<Ok<{ versions: VersionRow[] }> | Fail> {
  try {
    const supabase = await createClient();
    const versions = await listVersions(supabase, appId);
    return { ok: true, versions };
  } catch (e) {
    return fail(e);
  }
}

export async function logEvent(
  appId: string,
  kind: string,
  detail: Json,
): Promise<void> {
  try {
    const supabase = await createClient();
    await writeEvent(supabase, appId, kind, detail);
  } catch {
    // Fire and forget: usage logging must never break the UI.
  }
}

export async function setPrivate(
  appId: string,
  priv: boolean,
): Promise<Ok<{ priv: boolean }> | Fail> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("apps")
      .update({ private: priv })
      .eq("id", appId);
    if (error) throw new Error(error.message);
    revalidatePath(`/projects/${appId}`);
    return { ok: true, priv };
  } catch (e) {
    return fail(e);
  }
}

export async function setKind(
  appId: string,
  kind: string,
): Promise<Ok<{ kind: DesignMedium }> | Fail> {
  if (!isMediumId(kind)) return fail(new Error("bad kind"));
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("apps")
      .update({ kind })
      .eq("id", appId);
    if (error) throw new Error(error.message);
    revalidatePath(`/projects/${appId}`);
    return { ok: true, kind };
  } catch (e) {
    return fail(e);
  }
}

async function loadStage(appId: string) {
  const supabase = await createClient();
  const { data: app, error } = await supabase
    .from("apps")
    .select("id, version, stage")
    .eq("id", appId)
    .maybeSingle();
  if (error || !app) throw new Error("No such project.");
  return { supabase, app };
}

export async function advanceStage(
  appId: string,
): Promise<Ok<{ stage: string }> | Fail> {
  try {
    const { supabase, app } = await loadStage(appId);
    const next = nextStage(effectiveStage(app.stage, app.version));
    if (!next) throw new Error("Nothing left to advance.");
    const { error } = await supabase
      .from("apps")
      .update({ stage: next })
      .eq("id", appId);
    if (error) throw new Error(error.message);
    revalidatePath(`/projects/${appId}`);
    return { ok: true, stage: next };
  } catch (e) {
    return fail(e);
  }
}

export async function placeOrder(
  appId: string,
  order: { vendor: string; price: number; lead: number },
): Promise<{ ok: true } | Fail> {
  try {
    const { supabase } = await loadStage(appId);
    const arriveAt = new Date(Date.now() + 14 * 86400000).toISOString();
    const { error } = await supabase
      .from("apps")
      .update({
        stage: "sent",
        arrive_at: arriveAt,
        arrival_seen: false,
        order_info: order,
      })
      .eq("id", appId);
    if (error) throw new Error(error.message);
    revalidatePath(`/projects/${appId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

async function arriveNow(appId: string) {
  const { supabase } = await loadStage(appId);
  const { error } = await supabase
    .from("apps")
    .update({ stage: "arrived", arrive_at: null, arrival_seen: false })
    .eq("id", appId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${appId}`);
}

export async function markInstalled(
  appId: string,
): Promise<{ ok: true } | Fail> {
  try {
    await arriveNow(appId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function markFinished(
  appId: string,
): Promise<{ ok: true } | Fail> {
  try {
    await arriveNow(appId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function markArrived(
  appId: string,
): Promise<{ ok: true } | Fail> {
  try {
    await arriveNow(appId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function dismissArrival(
  appId: string,
): Promise<{ ok: true } | Fail> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("apps")
      .update({ arrival_seen: true })
      .eq("id", appId);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export type ProjectNote = {
  id: string;
  who: "you" | "apprentice";
  part: number | null;
  text: string;
};

export async function addProjectNote(
  appId: string,
  note: { who: "you" | "apprentice"; text: string; part?: number | null },
): Promise<Ok<{ note: ProjectNote }> | Fail> {
  const text = note.text.trim().slice(0, 2000);
  if (!text) return fail(new Error("Write something first."));
  try {
    const supabase = await createClient();
    const { data: app, error: appError } = await supabase
      .from("apps")
      .select("id")
      .eq("id", appId)
      .maybeSingle();
    if (appError || !app) throw new Error("No such project.");
    const { data, error } = await supabase
      .from("project_notes")
      .insert({
        app_id: appId,
        who: note.who,
        text,
        part: note.part ?? null,
      })
      .select("id, who, part, text")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Couldn't save.");
    revalidatePath(`/projects/${appId}`);
    return {
      ok: true,
      note: {
        id: data.id,
        who: data.who === "apprentice" ? "apprentice" : "you",
        part: data.part,
        text: data.text,
      },
    };
  } catch (e) {
    return fail(e);
  }
}

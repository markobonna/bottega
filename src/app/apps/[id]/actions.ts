"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
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
import { saveVersion } from "@/lib/versions";

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
    revalidatePath(`/apps/${appId}`);
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
    revalidatePath(`/apps/${appId}`);
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
    revalidatePath(`/apps/${appId}`);
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
    revalidatePath(`/apps/${appId}`);
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

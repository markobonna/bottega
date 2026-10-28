"use server";

import { revalidatePath } from "next/cache";
import {
  addRecord,
  deleteRecord,
  listRecords,
  updateRecord,
  type DbRecord,
} from "@/lib/records";
import { createClient } from "@/lib/supabase/server";

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

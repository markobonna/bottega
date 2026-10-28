"use server";

import type { Snapshot } from "@/lib/brain";
import { createClient } from "@/lib/supabase/server";
import {
  addExample,
  getOrCreateModel,
  removeExample,
  resetModel,
  saveModel,
  setLabel,
  type DbExample,
  type DbModel,
  type FeatureSource,
} from "@/lib/teach";

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; error: string };

function fail(e: unknown): Fail {
  return {
    ok: false,
    error: e instanceof Error ? e.message : "Something went wrong.",
  };
}

export async function getOrCreateModelAction(
  appId: string,
  blockId: string,
  labels: [string, string],
  dimNames: string[],
  source: FeatureSource,
): Promise<Ok<{ model: DbModel; examples: DbExample[] }> | Fail> {
  try {
    const supabase = await createClient();
    const result = await getOrCreateModel(
      supabase,
      appId,
      blockId,
      labels,
      dimNames,
      source,
    );
    return { ok: true, ...result };
  } catch (e) {
    return fail(e);
  }
}

export async function addExampleAction(
  modelId: string,
  photoPath: string,
  x: number[],
  y: 0 | 1,
): Promise<Ok<{ example: DbExample }> | Fail> {
  try {
    const supabase = await createClient();
    const example = await addExample(supabase, modelId, photoPath, x, y);
    return { ok: true, example };
  } catch (e) {
    return fail(e);
  }
}

export async function removeExampleAction(
  id: string,
): Promise<Ok<{ done: true }> | Fail> {
  try {
    const supabase = await createClient();
    await removeExample(supabase, id);
    return { ok: true, done: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setLabelAction(
  id: string,
  y: 0 | 1,
): Promise<Ok<{ done: true }> | Fail> {
  try {
    const supabase = await createClient();
    await setLabel(supabase, id, y);
    return { ok: true, done: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveModelAction(
  modelId: string,
  snap: Snapshot,
): Promise<Ok<{ done: true }> | Fail> {
  try {
    const supabase = await createClient();
    await saveModel(supabase, modelId, snap);
    return { ok: true, done: true };
  } catch (e) {
    return fail(e);
  }
}

export async function resetModelAction(
  modelId: string,
  source: FeatureSource,
  dimNames: string[],
): Promise<Ok<{ done: true }> | Fail> {
  try {
    const supabase = await createClient();
    await resetModel(supabase, modelId, source, dimNames);
    return { ok: true, done: true };
  } catch (e) {
    return fail(e);
  }
}

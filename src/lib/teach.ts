import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Snapshot } from "./brain";
import { downloadAsDataUrl } from "./media";
import { json, type MetaMessage } from "./meta";
import type { Database } from "./supabase/types";

// Teach storage. Every function takes the caller's own client (server
// actions pass the cookie-based one, scripts their signed-in one), so RLS
// always applies. This module never imports the admin client.

type Client = SupabaseClient<Database>;
export type DbModel = Database["public"]["Tables"]["models"]["Row"];
export type DbExample = Database["public"]["Tables"]["examples"]["Row"];
export type FeatureSource = "spark" | "color";

export interface TeachDim {
  name: string;
  hint: string;
}

const SYSTEM =
  "Score this photo on each quality from 0 to 1, using the hint as the scale. Judge only what is visible.";

export async function scorePhoto(
  client: Client,
  photoPath: string,
  dims: TeachDim[],
): Promise<{ x: number[]; source: FeatureSource }> {
  const { data: cached } = await client
    .from("photo_features")
    .select("x, source")
    .eq("photo_path", photoPath)
    .maybeSingle();
  if (cached && cached.x.length === dims.length) {
    return { x: cached.x, source: cached.source as FeatureSource };
  }
  const dataUrl = await downloadAsDataUrl(client, photoPath);
  const qualities = dims
    .map((d, i) => `${i + 1}. ${d.name} — ${d.hint}`)
    .join("\n");
  const messages: MetaMessage[] = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: [
        { type: "text", text: `Qualities:\n${qualities}` },
        { type: "image_url", image_url: { url: dataUrl } },
      ],
    },
  ];
  const parsed = await json(
    messages,
    z.object({ scores: z.array(z.number()).length(dims.length) }),
    { reasoning: "minimal", maxTokens: 4000 },
  );
  const x = parsed.scores.map((s) => Math.min(1, Math.max(0, s)));
  const { error } = await client
    .from("photo_features")
    .upsert(
      { photo_path: photoPath, x, source: "spark" },
      { onConflict: "owner,photo_path" },
    );
  if (error) throw new Error(`cache scores: ${error.message}`);
  return { x, source: "spark" };
}

export async function getOrCreateModel(
  client: Client,
  appId: string,
  blockId: string,
  labels: [string, string],
  dimNames: string[],
  source: FeatureSource,
): Promise<{ model: DbModel; examples: DbExample[] }> {
  const { data: found, error } = await client
    .from("models")
    .select("*")
    .eq("app_id", appId)
    .eq("block_id", blockId)
    .maybeSingle();
  if (error) throw new Error(`load model: ${error.message}`);
  let model = found;
  if (!model) {
    const { data, error: insertError } = await client
      .from("models")
      .insert({
        app_id: appId,
        block_id: blockId,
        labels,
        dims: dimNames,
        feature_source: source,
      })
      .select("*")
      .single();
    if (insertError || !data)
      throw new Error(
        `create model: ${insertError?.message ?? "failed"}`,
      );
    model = data;
  }
  const { data: examples, error: examplesError } = await client
    .from("examples")
    .select("*")
    .eq("model_id", model.id)
    .order("created_at", { ascending: true });
  if (examplesError) throw new Error(`load examples: ${examplesError.message}`);
  return { model, examples };
}

export async function addExample(
  client: Client,
  modelId: string,
  photoPath: string,
  x: number[],
  y: 0 | 1,
): Promise<DbExample> {
  const { data, error } = await client
    .from("examples")
    .insert({ model_id: modelId, photo_path: photoPath, x, y })
    .select("*")
    .single();
  if (error || !data)
    throw new Error(`add example: ${error?.message ?? "failed"}`);
  return data;
}

export async function removeExample(
  client: Client,
  id: string,
): Promise<void> {
  const { error } = await client.from("examples").delete().eq("id", id);
  if (error) throw new Error(`remove example: ${error.message}`);
}

export async function setLabel(
  client: Client,
  id: string,
  y: 0 | 1,
): Promise<void> {
  const { error } = await client.from("examples").update({ y }).eq("id", id);
  if (error) throw new Error(`set label: ${error.message}`);
}

export async function saveModel(
  client: Client,
  modelId: string,
  snap: Snapshot,
): Promise<void> {
  const { error } = await client
    .from("models")
    .update({
      labels: snap.labels,
      dims: snap.dims,
      w: snap.w,
      b: snap.b,
      rounds: snap.rounds,
      curve: snap.curve,
    })
    .eq("id", modelId);
  if (error) throw new Error(`save model: ${error.message}`);
}

export async function resetModel(
  client: Client,
  modelId: string,
  source: FeatureSource,
  dimNames: string[],
): Promise<void> {
  const { error: examplesError } = await client
    .from("examples")
    .update({ x: null })
    .eq("model_id", modelId);
  if (examplesError)
    throw new Error(`reset examples: ${examplesError.message}`);
  const { error: modelError } = await client
    .from("models")
    .update({ feature_source: source, dims: dimNames })
    .eq("id", modelId);
  if (modelError) throw new Error(`reset model: ${modelError.message}`);
}

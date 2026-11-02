import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { downloadAsDataUrl } from "./media";
import {
  editImage,
  image,
  json,
  sniffImageFormat,
  type MetaMessage,
} from "./meta";
import { parseSpec } from "./spec/schema";
import type { Database } from "./supabase/types";

// Project look generation, shared by POST /api/project-look and the demo
// seed so template projects get the same renders user projects do.

type Client = SupabaseClient<Database>;

const SUFFIX = "no text, no logos, no people's faces";

/** One dense paragraph describing a prototype photo, eyes only. */
export async function describePrototype(
  client: Client,
  photoPath: string,
  subject: string,
): Promise<string> {
  const dataUrl = await downloadAsDataUrl(client, photoPath);
  const messages: MetaMessage[] = [
    {
      role: "system",
      content:
        "Describe this prototype photo in one dense paragraph for a product photographer: materials, colors, proportions, construction details. Judge only what is visible.",
    },
    {
      role: "user",
      content: [
        { type: "text", text: `Prototype of: ${subject}` },
        { type: "image_url", image_url: { url: dataUrl } },
      ],
    },
  ];
  const seen = await json(messages, z.object({ description: z.string() }), {
    reasoning: "minimal",
    maxTokens: 800,
  });
  return seen.description;
}

function promptBase(spec: {
  name: string;
  tagline: string;
  screens: { blocks: { type: string; title: string }[] }[];
}): string {
  const blocks = spec.screens
    .flatMap((s) => s.blocks.map((b) => `${b.type}: ${b.title}`))
    .join("; ")
    .slice(0, 400);
  return `${spec.name}: ${spec.tagline}. It has ${blocks}.`;
}

/** The app's real screens, so the wireframe draws this app — not four
 *  generic phones. Pure so tests can lock the contract. */
export function specScreenLine(spec: {
  screens: { title: string; blocks: { type: string; title: string }[] }[];
}): string {
  const parts = spec.screens.map(
    (s) =>
      `${s.title} (${s.blocks.map((b) => `${b.type}: ${b.title}`).join(", ")})`,
  );
  return `Screens: ${parts.join("; ")}`.slice(0, 500);
}

/**
 * The sketch prompt: a black and white bare-bones image, nothing else.
 * Software draws one frame per real screen (screenCount from the spec),
 * so the sketch mirrors the app it will become. Pure so tests can lock
 * the contract.
 */
export function sketchPrompt(
  kind: string,
  base: string,
  screenCount = 0,
): string {
  if (kind === "hardware") {
    return `A black and white pencil concept sketch of ${base}, bare-bones, minimal lines, white background, ${SUFFIX}`;
  }
  const frames =
    screenCount === 1
      ? "exactly one phone screen, a single phone frame filling the view"
      : screenCount >= 2
        ? `exactly ${screenCount} phone screens, one phone frame per screen, arranged in a compact grid`
        : "the app's phone screens, one phone frame per screen, arranged in a compact grid";
  return `A black and white wireframe sketch of a phone app for ${base}, ${frames}, each screen fully visible with bare-bones UI boxes buttons and text lines, everything fully inside the frame, no icon grid, white background, ${SUFFIX}`;
}

/** The portrait grows out of the sketch: same object, realized. Plain
 * white background, no invented setting — the object alone. */
export function portraitPrompt(kind: string): string {
  return kind === "hardware"
    ? `A full-color product photo render of this sketched object, same object and composition, isolated on a plain white background, no room, no scenery, warm light, ${SUFFIX}`
    : `A clean full-color app design mockup of this wireframe sketch, same phone screens, same layout in each screen, each screen fully visible, plain white background, no scenery, ${SUFFIX}`;
}

/**
 * Revise prompts: the user's change, with the house invariants locked
 * (sketch stays B&W on white; portrait keeps the object on white with
 * no invented scenery). Pure so tests can lock the contract.
 */
export function reviseSketchPrompt(kind: string, instruction: string): string {
  return kind === "hardware"
    ? `${instruction}, keep it a black and white pencil concept sketch, bare-bones, minimal lines, white background, ${SUFFIX}`
    : `${instruction}, keep it a black and white wireframe sketch of the same phone app screens, one phone frame per screen, each screen fully visible, everything fully inside the frame, white background, ${SUFFIX}`;
}

export function revisePortraitPrompt(kind: string, instruction: string): string {
  return kind === "hardware"
    ? `${instruction}, same object and composition, isolated on a plain white background, no room, no scenery, ${SUFFIX}`
    : `${instruction}, same phone screens, same layout in each screen, each screen fully visible, plain white background, no scenery, ${SUFFIX}`;
}

async function uploadImage(
  client: Client,
  path: string,
  bytes: Uint8Array,
): Promise<void> {
  const { mime } = sniffImageFormat(bytes);
  const { error } = await client.storage
    .from("media")
    .upload(path, new Blob([bytes as BlobPart], { type: mime }), {
      contentType: mime,
      upsert: true,
    });
  if (error) throw new Error(error.message);
}

/**
 * Render + upload the B&W sketch. Stored in blueprint_path (the
 * pre-sketch column name); the caller writes the path to the app row.
 */
export async function renderSketch(
  client: Client,
  uid: string,
  app: { id: string; spec: unknown; kind: string },
  extra?: string,
): Promise<{ sketchPath: string; sketchBytes: Uint8Array }> {
  const parsed = parseSpec(app.spec);
  if (!parsed.ok) throw new Error("Bad project spec.");
  let base = promptBase(parsed.spec) + (extra ?? "");
  if (app.kind !== "hardware") {
    base += ` ${specScreenLine(parsed.spec)}`;
  }
  const sketchBytes = await image(
    sketchPrompt(app.kind, base, parsed.spec.screens.length),
  );
  const sketchPath = `${uid}/${app.id}/blueprint.png`;
  await uploadImage(client, sketchPath, sketchBytes);
  return { sketchPath, sketchBytes };
}

/**
 * Render + upload the color portrait from sketch bytes. The sketch did
 * half the job: same object and composition, realized in color.
 */
export async function renderPortraitFromSketch(
  client: Client,
  uid: string,
  app: { id: string; kind: string },
  sketchBytes: Uint8Array,
): Promise<string> {
  const lookBytes = await editImage(
    portraitPrompt(app.kind),
    sketchBytes as Uint8Array<ArrayBuffer>,
    "1024x1024",
    55000,
  );
  const lookPath = `${uid}/${app.id}/look.png`;
  await uploadImage(client, lookPath, lookBytes);
  return lookPath;
}

/**
 * Revise what's shown: edit the current sketch or portrait with the
 * user's instruction, uploaded over the same path (upsert). The caller
 * regrows the portrait after a sketch revise so the lineage holds.
 */
export async function reviseArt(
  client: Client,
  target: "sketch" | "portrait",
  sourcePath: string,
  instruction: string,
  kind: string,
): Promise<void> {
  const { data, error: dlError } = await client.storage
    .from("media")
    .download(sourcePath);
  if (dlError || !data)
    throw new Error(dlError?.message || "Nothing to revise yet.");
  const sourceBytes = new Uint8Array(await data.arrayBuffer());
  const prompt =
    target === "sketch"
      ? reviseSketchPrompt(kind, instruction)
      : revisePortraitPrompt(kind, instruction);
  const revised = await editImage(
    prompt,
    sourceBytes as Uint8Array<ArrayBuffer>,
    "1024x1024",
    55000,
  );
  await uploadImage(client, sourcePath, revised);
}

/**
 * Render + upload sketch then portrait, sequentially. Returns the
 * storage paths; the caller writes them to the app row.
 */
export async function renderLook(
  client: Client,
  uid: string,
  app: { id: string; spec: unknown; kind: string },
  extra?: string,
): Promise<{ lookPath: string; blueprintPath: string | null }> {
  const { sketchPath, sketchBytes } = await renderSketch(
    client,
    uid,
    app,
    extra,
  );
  const lookPath = await renderPortraitFromSketch(client, uid, app, sketchBytes);
  return { lookPath, blueprintPath: sketchPath };
}

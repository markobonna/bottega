import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { downloadAsDataUrl } from "./media";
import { image, json, type MetaMessage } from "./meta";
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

/**
 * Render + upload look.png (and blueprint.png for hardware). Returns the
 * storage paths; the caller writes them to the app row.
 */
export async function renderLook(
  client: Client,
  uid: string,
  app: { id: string; spec: unknown; kind: string },
  extra?: string,
): Promise<{ lookPath: string; blueprintPath: string | null }> {
  const parsed = parseSpec(app.spec);
  if (!parsed.ok) throw new Error("Bad project spec.");
  const base = promptBase(parsed.spec) + (extra ?? "");
  const jobs: Promise<Uint8Array>[] = [
    image(
      app.kind === "hardware"
        ? `A product photo of ${base}, warm light, ${SUFFIX}`
        : `A clean app design mockup for ${base}, ${SUFFIX}`,
    ),
  ];
  if (app.kind === "hardware") {
    jobs.push(
      image(
        `A technical blueprint schematic drawing of ${base}, white lines on blue background, ${SUFFIX}`,
      ),
    );
  }
  const [look, blueprint] = await Promise.all(jobs);
  const lookPath = `${uid}/${app.id}/look.png`;
  const up1 = await client.storage
    .from("media")
    .upload(lookPath, new Blob([look as BlobPart], { type: "image/png" }), {
      contentType: "image/png",
      upsert: true,
    });
  if (up1.error) throw new Error(up1.error.message);
  let blueprintPath: string | null = null;
  if (blueprint) {
    blueprintPath = `${uid}/${app.id}/blueprint.png`;
    const up2 = await client.storage.from("media").upload(
      blueprintPath,
      new Blob([blueprint as BlobPart], { type: "image/png" }),
      {
        contentType: "image/png",
        upsert: true,
      },
    );
    if (up2.error) throw new Error(up2.error.message);
  }
  return { lookPath, blueprintPath };
}

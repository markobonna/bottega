import { z } from "zod";

import { fail, requireUser } from "@/lib/api";
import { json, ModelError, transcribe } from "@/lib/meta";
import { parseSpec } from "@/lib/spec/schema";
import { checkValues } from "@/lib/values";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO = 10 * 1024 * 1024;

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form." }, { status: 400 });
  }
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0 || audio.size > MAX_AUDIO) {
    return Response.json(
      { error: "Audio must be a WAV of at most 10 MB." },
      { status: 400 },
    );
  }
  if ((await audio.slice(0, 4).text()) !== "RIFF") {
    return Response.json({ error: "Audio must be a WAV file." }, { status: 400 });
  }
  try {
    const bytes = new Uint8Array(await audio.arrayBuffer());
    const transcript = await transcribe(bytes);
    const appId = form.get("appId");
    const blockId = form.get("blockId");
    if (
      typeof appId !== "string" ||
      appId === "" ||
      typeof blockId !== "string" ||
      blockId === ""
    ) {
      return Response.json({ transcript });
    }
    const { data: app } = await auth.supabase
      .from("apps")
      .select("spec")
      .eq("id", appId)
      .maybeSingle();
    if (!app) return Response.json({ error: "No such app." }, { status: 404 });
    const parsed = parseSpec(app.spec);
    if (!parsed.ok)
      return Response.json({ error: "Bad app spec." }, { status: 404 });
    const hear = parsed.spec.screens
      .flatMap((s) => s.blocks)
      .find((b) => b.type === "hear" && b.id === blockId);
    if (!hear || hear.type !== "hear") {
      return Response.json({ error: "No such hear block." }, { status: 404 });
    }
    const collection = parsed.spec.collections.find(
      (c) => c.id === hear.collection,
    );
    if (!collection) {
      return Response.json({ error: "No such collection." }, { status: 404 });
    }
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const fid of hear.fields) {
      const field = collection.fields.find((f) => f.id === fid);
      if (!field) continue;
      switch (field.type) {
        case "text":
          shape[fid] = z.string().nullable();
          break;
        case "number":
          shape[fid] = z.number().nullable();
          break;
        case "date":
          shape[fid] = z.string().nullable();
          break;
        case "choice":
          shape[fid] = (
            field.options?.length
              ? z.enum(field.options as [string, ...string[]])
              : z.string()
          ).nullable();
          break;
        case "bool":
          shape[fid] = z.boolean().nullable();
          break;
        case "photo":
          break;
      }
    }
    const today = new Date().toISOString().slice(0, 10);
    const values = await json(
      [
        {
          role: "system",
          content: `Fill in the form from what the person said. Use null for anything they didn't say. Today is ${today}; resolve 'tomorrow', 'Friday' to dates.`,
        },
        { role: "user", content: transcript },
      ],
      z.object(shape),
      // Reasoning tokens count toward max_tokens; 800 starves the answer.
      { maxTokens: 2000 },
    );
    const checked = checkValues(collection, values as Record<string, unknown>);
    return Response.json({ transcript, values: checked.data });
  } catch (e) {
    if (e instanceof ModelError && e.status === 429) {
      console.error(e.message);
      return Response.json({ error: "Too many voice requests." }, { status: 429 });
    }
    return fail(e);
  }
}

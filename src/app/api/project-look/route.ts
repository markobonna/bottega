import { z } from "zod";

import { fail, readJson, requireUser } from "@/lib/api";
import { downloadAsDataUrl } from "@/lib/media";
import { image, json, type MetaMessage } from "@/lib/meta";
import { parseSpec } from "@/lib/spec/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  appId: z.string().min(1),
  photoPath: z.string().min(1).optional(),
});

const SUFFIX = "no text, no logos, no people's faces";

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, BodySchema);
  if (body instanceof Response) return body;
  const { data: app } = await auth.supabase
    .from("apps")
    .select("id, name, spec, kind, owner")
    .eq("id", body.appId)
    .maybeSingle();
  if (!app || app.owner !== auth.user.id)
    return Response.json({ error: "No such project." }, { status: 404 });
  const parsed = parseSpec(app.spec);
  if (!parsed.ok)
    return Response.json({ error: "Bad project spec." }, { status: 404 });

  const blocks = parsed.spec.screens
    .flatMap((s) => s.blocks.map((b) => `${b.type}: ${b.title}`))
    .join("; ")
    .slice(0, 400);
  let base = `${parsed.spec.name}: ${parsed.spec.tagline}. It has ${blocks}.`;
  let fromPhoto = false;
  try {
    if (body.photoPath) {
      if (!body.photoPath.startsWith(`${auth.user.id}/${body.appId}/`)) {
        return Response.json(
          { error: "That photo doesn't belong to this project." },
          { status: 403 },
        );
      }
      const dataUrl = await downloadAsDataUrl(
        auth.supabase,
        body.photoPath,
      );
      const messages: MetaMessage[] = [
        {
          role: "system",
          content:
            "Describe this prototype photo in one dense paragraph for a product photographer: materials, colors, proportions, construction details. Judge only what is visible.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Prototype of: ${base}` },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ];
      const seen = await json(
        messages,
        z.object({ description: z.string() }),
        { reasoning: "minimal", maxTokens: 800 },
      );
      base += ` It looks like this: ${seen.description.slice(0, 600)}`;
      fromPhoto = true;
    }
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
    const uid = auth.user.id;
    const lookPath = `${uid}/${app.id}/look.png`;
    const up1 = await auth.supabase.storage
      .from("media")
      .upload(lookPath, new Blob([look as BlobPart], { type: "image/png" }), {
        contentType: "image/png",
        upsert: true,
      });
    if (up1.error) throw new Error(up1.error.message);
    let blueprintPath: string | null = null;
    if (blueprint) {
      blueprintPath = `${uid}/${app.id}/blueprint.png`;
      const up2 = await auth.supabase.storage
        .from("media")
        .upload(
          blueprintPath,
          new Blob([blueprint as BlobPart], { type: "image/png" }),
          {
            contentType: "image/png",
            upsert: true,
          },
        );
      if (up2.error) throw new Error(up2.error.message);
    }
    const { error: upError } = await auth.supabase
      .from("apps")
      .update({ look_path: lookPath, blueprint_path: blueprintPath })
      .eq("id", app.id);
    if (upError) throw new Error(upError.message);
    return Response.json({ lookPath, blueprintPath, fromPhoto });
  } catch (e) {
    return fail(e);
  }
}

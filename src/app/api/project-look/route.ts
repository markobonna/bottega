import { z } from "zod";

import { fail, readJson, requireUser } from "@/lib/api";
import { describePrototype, renderLook } from "@/lib/project-look";
import { parseSpec } from "@/lib/spec/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  appId: z.string().min(1),
  photoPath: z.string().min(1).optional(),
});

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
  if (!parseSpec(app.spec).ok)
    return Response.json({ error: "Bad project spec." }, { status: 404 });

  let extra: string | undefined;
  let fromPhoto = false;
  try {
    if (body.photoPath) {
      if (!body.photoPath.startsWith(`${auth.user.id}/${body.appId}/`)) {
        return Response.json(
          { error: "That photo doesn't belong to this project." },
          { status: 403 },
        );
      }
      const description = await describePrototype(
        auth.supabase,
        body.photoPath,
        app.name,
      );
      extra = ` It looks like this: ${description.slice(0, 600)}`;
      fromPhoto = true;
    }
    const { lookPath, blueprintPath } = await renderLook(
      auth.supabase,
      auth.user.id,
      { id: app.id, spec: app.spec, kind: app.kind ?? "software" },
      extra,
    );
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

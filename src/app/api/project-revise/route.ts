import { z } from "zod";

import { fail, readJson, requireUser } from "@/lib/api";
import { reviseArt } from "@/lib/project-look";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  appId: z.string().min(1),
  target: z.enum(["sketch", "portrait"]),
  instruction: z.string().trim().min(3).max(300),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, BodySchema);
  if (body instanceof Response) return body;
  const { data: app } = await auth.supabase
    .from("apps")
    .select("id, owner, kind, look_path, blueprint_path")
    .eq("id", body.appId)
    .maybeSingle();
  if (!app || app.owner !== auth.user.id)
    return Response.json({ error: "No such project." }, { status: 404 });
  const sourcePath =
    body.target === "sketch" ? app.blueprint_path : app.look_path;
  if (
    !sourcePath ||
    !sourcePath.startsWith(`${auth.user.id}/${body.appId}/`)
  ) {
    return Response.json(
      { error: "Nothing to revise yet — let it paint first." },
      { status: 400 },
    );
  }

  try {
    await reviseArt(
      auth.supabase,
      body.target,
      sourcePath,
      body.instruction,
      app.kind ?? "software",
    );
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

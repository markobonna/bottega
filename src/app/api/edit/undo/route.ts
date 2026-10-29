import { z } from "zod";

import { readJson, requireUser } from "@/lib/api";
import { restorePrevious } from "@/lib/versions";

export const runtime = "nodejs";

const BodySchema = z.object({ appId: z.string().min(1) });

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, BodySchema);
  if (body instanceof Response) return body;
  const { data: app } = await auth.supabase
    .from("apps")
    .select("version")
    .eq("id", body.appId)
    .maybeSingle();
  if (!app) return Response.json({ error: "No such app." }, { status: 404 });
  if (app.version <= 1) {
    return Response.json({ error: "Nothing to undo yet." }, { status: 400 });
  }
  try {
    const { version } = await restorePrevious(auth.supabase, body.appId);
    return Response.json({ version });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Undo failed." },
      { status: 400 },
    );
  }
}

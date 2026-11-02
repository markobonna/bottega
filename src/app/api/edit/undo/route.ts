import { z } from "zod";

import { readJson, requireUser } from "@/lib/api";
import { parseSoftwareFilesState } from "@/lib/software-build";
import {
  restorePrevious,
  restorePreviousFiles,
  restoreVersion,
} from "@/lib/versions";

export const runtime = "nodejs";

const BodySchema = z.object({
  appId: z.string().min(1),
  version: z.number().int().min(1).optional(),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, BodySchema);
  if (body instanceof Response) return body;
  const { data: app } = await auth.supabase
    .from("apps")
    .select("version, owner, build_files")
    .eq("id", body.appId)
    .maybeSingle();
  if (!app || app.owner !== auth.user.id)
    return Response.json({ error: "No such project." }, { status: 404 });
  if (app.version <= 1) {
    return Response.json({ error: "Nothing to undo yet." }, { status: 400 });
  }
  try {
    const filesUndo =
      body.version === undefined &&
      parseSoftwareFilesState(app.build_files) !== null;
    const { version } = filesUndo
      ? await restorePreviousFiles(auth.supabase, body.appId)
      : body.version === undefined
        ? await restorePrevious(auth.supabase, body.appId)
        : await restoreVersion(auth.supabase, body.appId, body.version);
    return Response.json({ version });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Undo failed." },
      { status: 400 },
    );
  }
}

import { z } from "zod";

import { fail, readJson, requireUser } from "@/lib/api";
import { EditError, proposeEdit } from "@/lib/edit-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  appId: z.string().min(1),
  request: z.string().min(3).max(400),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, BodySchema);
  if (body instanceof Response) return body;
  try {
    return Response.json(
      await proposeEdit(auth.supabase, body.appId, body.request),
    );
  } catch (e) {
    if (e instanceof EditError) {
      return Response.json(
        { error: e.message, ...(e.issues ? { issues: e.issues } : {}) },
        { status: e.status },
      );
    }
    return fail(e);
  }
}

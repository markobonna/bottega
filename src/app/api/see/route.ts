import { z } from "zod";

import { fail, readJson, requireUser } from "@/lib/api";
import { downloadAsDataUrl } from "@/lib/media";
import { segment } from "@/lib/sam";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  appId: z.string().min(1),
  photoPath: z.string().min(1),
  nouns: z.array(z.string().min(1)).min(1).max(6),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, BodySchema);
  if (body instanceof Response) return body;
  if (!body.photoPath.startsWith(`${auth.user.id}/${body.appId}/`)) {
    return Response.json(
      { error: "That photo doesn't belong to this app." },
      { status: 403 },
    );
  }
  try {
    const dataUrl = await downloadAsDataUrl(auth.supabase, body.photoPath);
    const results = await Promise.all(
      body.nouns.map((noun) => segment(dataUrl, noun)),
    );
    const nouns = body.nouns.map((noun, i) => {
      const objects = results[i].objects.filter((o) => o.c >= 0.5);
      return { noun, count: objects.length, objects };
    });
    return Response.json({ w: results[0].w, h: results[0].h, nouns });
  } catch (e) {
    return fail(e);
  }
}

import { z } from "zod";

import { fail, readJson, requireUser } from "@/lib/api";
import { clampParams } from "@/lib/make/shelf";
import { json } from "@/lib/meta";

export const runtime = "nodejs";
export const maxDuration = 30;

const BodySchema = z.object({ sentence: z.string().min(5).max(300) });

const ParamsSchema = z.object({
  width: z.number(),
  height: z.number(),
  depth: z.number(),
  shelves: z.number(),
  thickness: z.number(),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, BodySchema);
  if (body instanceof Response) return body;
  try {
    const draft = await json(
      [
        {
          role: "system",
          content: "Turn the person's description into shelf parameters in millimetres.",
        },
        { role: "user", content: body.sentence },
      ],
      ParamsSchema,
      { reasoning: "minimal", maxTokens: 400 },
    );
    return Response.json({ params: clampParams(draft) });
  } catch (e) {
    return fail(e);
  }
}

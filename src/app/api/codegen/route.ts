import { z } from "zod";
import { fail, readJson, requireUser } from "@/lib/api";
import {
  buildCodegenPrompt,
  CodegenFilesSchema,
  validateCodegenFiles,
} from "@/lib/codegen";
import { jsonWithFallback, type MetaMessage } from "@/lib/meta";
import { parseSpec } from "@/lib/spec/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  appId: z.string().uuid(),
  formFactor: z.enum(["mobile", "desktop"]),
});

const GEN_OPTS = { maxTokens: 12000, timeoutMs: 55000 };

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, Body);
  if (body instanceof Response) return body;
  const { data: app } = await auth.supabase
    .from("apps")
    .select("id, spec")
    .eq("id", body.appId)
    .single();
  if (!app) return Response.json({ error: "Not found." }, { status: 404 });
  const parsed = parseSpec(app.spec);
  if (!parsed.ok) {
    return Response.json(
      { error: "This app's design didn't pass its checks.", issues: parsed.issues },
      { status: 422 },
    );
  }
  const { system, user } = buildCodegenPrompt(parsed.spec, body.formFactor);
  const messages: MetaMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  try {
    const first = await jsonWithFallback(messages, CodegenFilesSchema, GEN_OPTS);
    let data = first.data;
    let via = first.via;
    let check = validateCodegenFiles(data.files);
    if (!check.ok) {
      const repair = await jsonWithFallback(
        [
          ...messages,
          { role: "assistant", content: JSON.stringify(data) },
          {
            role: "user",
            content: `Fix only these problems, then return the full files object again:\n${check.issues.join("\n")}`,
          },
        ],
        CodegenFilesSchema,
        GEN_OPTS,
      );
      data = repair.data;
      via = repair.via;
      check = validateCodegenFiles(data.files);
    }
    if (!check.ok) {
      return Response.json(
        {
          error: "Couldn't generate a valid app from that design. Try again.",
          issues: check.issues,
        },
        { status: 422 },
      );
    }
    return Response.json({ files: check.files, via });
  } catch (e) {
    return fail(e);
  }
}

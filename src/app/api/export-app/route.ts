import { readFileSync } from "node:fs";
import { join } from "node:path";
import { requireUser } from "@/lib/api";
import { slug } from "@/lib/design/cad";
import {
  buildStandaloneHtml,
  seedRecords,
} from "@/lib/export/standalone";
import { listRecords } from "@/lib/records";
import { parseSpec } from "@/lib/spec/schema";

export const runtime = "nodejs";

// Download the app as one self-contained HTML file: the spec, a seed of
// the records, and the standalone renderer. RLS owns access — another
// user's id is simply not found, and unchecked specs never export.
export async function GET(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { searchParams } = new URL(req.url);
  const appId = searchParams.get("appId") ?? "";
  if (!/^[0-9a-f-]{10,60}$/i.test(appId)) {
    return Response.json({ error: "Bad app id." }, { status: 400 });
  }
  const { data: app } = await auth.supabase
    .from("apps")
    .select("id, name, version, spec")
    .eq("id", appId)
    .eq("owner", auth.user.id)
    .single();
  if (!app) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  const parsed = parseSpec(app.spec);
  if (!parsed.ok) {
    return Response.json(
      { error: "This app's design didn't pass its checks." },
      { status: 422 },
    );
  }
  const spec = parsed.spec;
  const entries = await Promise.all(
    spec.collections.map(
      async (c) => [c.id, await listRecords(auth.supabase, appId, c.id)] as const,
    ),
  );
  const bootSrc = readFileSync(
    join(process.cwd(), "src", "lib", "export", "standalone-boot.js"),
    "utf8",
  );
  const html = buildStandaloneHtml({
    appId: app.id,
    appName: app.name,
    version: app.version,
    spec,
    seed: seedRecords(spec, Object.fromEntries(entries)),
    bootSrc,
  });
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug(app.name)}-app.html"`,
    },
  });
}

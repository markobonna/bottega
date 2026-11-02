import { z } from "zod";

import { fail, readJson, requireUser } from "@/lib/api";
import { MissingKeyError } from "@/lib/meta";
import type { Json } from "@/lib/supabase/types";
import {
  generateSoftwareDesign,
  generateSoftwarePrototype,
} from "@/lib/software-server";
import {
  parseSoftwareFilesState,
  type SoftwareFilesState,
} from "@/lib/software-build";

export const runtime = "nodejs";
export const maxDuration = 120;

const BodySchema = z.object({
  appId: z.string().min(1),
  formFactor: z.enum(["mobile", "desktop"]),
  phase: z.enum(["design", "prototype"]).default("design"),
});

/** Spark builds the software app from the stored brief in two phases:
 *  design (HTML + CSS, the Blueprint) once the shape is picked, then
 *  prototype (JS + readme) wired to that exact design. Stores the files
 *  on the app row. No key -> 503 and the board says the honest
 *  off-state; the spec path stays the fallback. */
export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, BodySchema);
  if (body instanceof Response) return body;
  try {
    const { data: app, error } = await auth.supabase
      .from("apps")
      .select("id, owner, brief, kind, build_files")
      .eq("id", body.appId)
      .single();
    if (error || !app) {
      return Response.json({ error: "No such project." }, { status: 404 });
    }
    if (app.owner !== auth.user.id) {
      return Response.json({ error: "No such project." }, { status: 404 });
    }
    if (app.kind !== "software") {
      return Response.json(
        { error: "Only software projects are designed this way." },
        { status: 400 },
      );
    }
    if (!app.brief) {
      return Response.json(
        { error: "This project has no brief to design from." },
        { status: 400 },
      );
    }
    const prev = parseSoftwareFilesState(app.build_files);
    let files: { path: string; content: string }[];
    let via: "meta" | "open";
    let summary: string;
    if (body.phase === "prototype") {
      const design = (prev?.files ?? []).filter((f) =>
        ["index.html", "styles.css"].includes(f.path),
      );
      if (design.length < 2) {
        return Response.json(
          { error: "Design this app before building its prototype." },
          { status: 400 },
        );
      }
      ({ files, via } = await generateSoftwarePrototype(
        app.brief,
        prev?.formFactor ?? body.formFactor,
        design,
      ));
      summary = "Brought the prototype to life";
    } else {
      ({ files, via } = await generateSoftwareDesign(
        app.brief,
        body.formFactor,
      ));
      summary = "Regenerated the design";
    }
    // Regenerating keeps history: the previous files stay undoable. A
    // redesign drops the old prototype JS with the old HTML it wired.
    const now = new Date().toISOString();
    const state: SoftwareFilesState = {
      files,
      formFactor: body.phase === "prototype" && prev ? prev.formFactor : body.formFactor,
      via,
      updatedAt: now,
      history: prev
        ? [...prev.history, { files: prev.files, summary, at: now }].slice(-10)
        : [],
    };
    const { error: saveError } = await auth.supabase
      .from("apps")
      .update({
        build_files: state as unknown as Json,
        form_factor: body.formFactor,
      })
      .eq("id", body.appId);
    if (saveError) throw new Error(saveError.message);
    return Response.json({ files, via });
  } catch (e) {
    if (e instanceof MissingKeyError) {
      return Response.json({ error: "off" }, { status: 503 });
    }
    return fail(e);
  }
}

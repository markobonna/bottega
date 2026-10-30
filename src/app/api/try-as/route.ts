import { z } from "zod";

import type { SupabaseClient } from "@supabase/supabase-js";

import { readJson, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({ who: z.enum(["maria", "cole"]) });

type Admin = SupabaseClient<Database>;

// Photo paths look like "<uid>/<appId>/<file>". Templates keep their ids;
// every copy gets fresh ones, so rewrite both segments.
function rewriter(
  templateUid: string,
  guestUid: string,
  appMap: Map<string, string>,
): (path: string) => string | null {
  return (path: string) => {
    for (const [oldApp, newApp] of appMap) {
      const prefix = `${templateUid}/${oldApp}/`;
      if (path.startsWith(prefix)) {
        return `${guestUid}/${newApp}/${path.slice(prefix.length)}`;
      }
    }
    return null;
  };
}

function rewriteData(
  value: unknown,
  rewrite: (path: string) => string | null,
): unknown {
  if (typeof value === "string") return rewrite(value) ?? value;
  if (Array.isArray(value)) return value.map((v) => rewriteData(v, rewrite));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, rewriteData(v, rewrite)]),
    );
  }
  return value;
}

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, BodySchema);
  if (body instanceof Response) return body;
  const templateUid =
    body.who === "maria"
      ? process.env.TEMPLATE_MARIA_UID
      : process.env.TEMPLATE_COLE_UID;
  if (!templateUid) {
    return Response.json(
      { error: "Demo templates aren't set up yet." },
      { status: 500 },
    );
  }
  const guestUid = auth.user.id;
  const admin: Admin = createAdminClient();

  const { data: apps, error: appsError } = await admin
    .from("apps")
    .select("*")
    .eq("owner", templateUid)
    .order("created_at", { ascending: true });
  if (appsError) {
    return Response.json({ error: "Couldn't load the demo." }, { status: 502 });
  }
  if (!apps.length) {
    return Response.json(
      { error: "The demo template is empty. Run the seed first." },
      { status: 404 },
    );
  }

  try {
    const { data: workshops, error: wError } = await admin
      .from("workshops")
      .select("*")
      .eq("owner", templateUid);
    if (wError) throw new Error(`load workshops: ${wError.message}`);
    const workshopMap = new Map<string, string>();
    for (const w of workshops) {
      const { data, error } = await admin
        .from("workshops")
        .insert({ owner: guestUid, name: w.name, type: w.type })
        .select("id")
        .single();
      if (error || !data) throw new Error(`copy workshop: ${error?.message}`);
      workshopMap.set(w.id, data.id);
    }
    const appMap = new Map<string, string>();
    for (const app of apps) {
      const workshopId = workshopMap.get(app.workshop_id);
      if (!workshopId) throw new Error("copy app: workshop missing");
      const { data, error } = await admin
        .from("apps")
        .insert({
          owner: guestUid,
          name: app.name,
          spec: app.spec,
          version: app.version,
          private: app.private,
          kind: app.kind,
          workshop_id: workshopId,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(`copy app: ${error?.message}`);
      appMap.set(app.id, data.id);
    }
    const rewrite = rewriter(templateUid, guestUid, appMap);
    for (const app of apps) {
      if (!app.look_path && !app.blueprint_path) continue;
      const { error } = await admin
        .from("apps")
        .update({
          look_path: app.look_path ? rewrite(app.look_path) : null,
          blueprint_path: app.blueprint_path
            ? rewrite(app.blueprint_path)
            : null,
        })
        .eq("id", appMap.get(app.id)!);
      if (error) throw new Error(`copy art paths: ${error.message}`);
    }

    for (const [oldApp, newApp] of appMap) {
      const { data: versions, error: vError } = await admin
        .from("app_versions")
        .select("*")
        .eq("app_id", oldApp);
      if (vError) throw new Error(`load versions: ${vError.message}`);
      for (const v of versions) {
        const { error } = await admin.from("app_versions").insert({
          owner: guestUid,
          app_id: newApp,
          version: v.version,
          spec: v.spec,
          ops: v.ops,
          summary: v.summary,
          source: v.source,
        });
        if (error) throw new Error(`copy version: ${error.message}`);
      }

      const { data: records, error: rError } = await admin
        .from("records")
        .select("*")
        .eq("app_id", oldApp);
      if (rError) throw new Error(`load records: ${rError.message}`);
      for (const r of records) {
        const { error } = await admin.from("records").insert({
          owner: guestUid,
          app_id: newApp,
          collection: r.collection,
          data: rewriteData(r.data, rewrite) as Record<string, never>,
        });
        if (error) throw new Error(`copy record: ${error.message}`);
      }

      const { data: models, error: mError } = await admin
        .from("models")
        .select("*")
        .eq("app_id", oldApp);
      if (mError) throw new Error(`load models: ${mError.message}`);
      for (const m of models) {
        const { data: nm, error: nmError } = await admin
          .from("models")
          .insert({
            owner: guestUid,
            app_id: newApp,
            block_id: m.block_id,
            labels: m.labels,
            dims: m.dims,
            w: m.w,
            b: m.b,
            rounds: m.rounds,
            curve: m.curve,
            feature_source: m.feature_source,
          })
          .select("id")
          .single();
        if (nmError || !nm) throw new Error(`copy model: ${nmError?.message}`);
        const { data: examples, error: eError } = await admin
          .from("examples")
          .select("*")
          .eq("model_id", m.id);
        if (eError) throw new Error(`load examples: ${eError.message}`);
        for (const e of examples) {
          const photoPath = e.photo_path ? rewrite(e.photo_path) : null;
          if (e.photo_path && !photoPath) continue;
          const { error } = await admin.from("examples").insert({
            owner: guestUid,
            model_id: nm.id,
            photo_path: photoPath,
            x: e.x,
            y: e.y,
          });
          if (error) throw new Error(`copy example: ${error.message}`);
        }
      }
    }

    // Feature cache rows travel with the photos, so the copy scores identically.
    const { data: features, error: fError } = await admin
      .from("photo_features")
      .select("*")
      .eq("owner", templateUid);
    if (fError) throw new Error(`load features: ${fError.message}`);
    for (const f of features) {
      const photoPath = rewrite(f.photo_path);
      if (!photoPath) continue;
      const { error } = await admin.from("photo_features").insert({
        owner: guestUid,
        photo_path: photoPath,
        x: f.x,
        source: f.source,
      });
      if (error) throw new Error(`copy features: ${error.message}`);
    }

    // Storage files, folder by folder (folders are template app ids),
    // copied in parallel: 13 sequential round-trips was the slow part.
    const { data: folders, error: lError } = await admin.storage
      .from("media")
      .list(templateUid);
    if (lError) throw new Error(`list storage: ${lError.message}`);
    const jobs: [string, string][] = [];
    for (const folder of folders) {
      if (!appMap.has(folder.name)) continue;
      const { data: files, error: flError } = await admin.storage
        .from("media")
        .list(`${templateUid}/${folder.name}`);
      if (flError) throw new Error(`list storage: ${flError.message}`);
      for (const file of files) {
        const from = `${templateUid}/${folder.name}/${file.name}`;
        const to = rewrite(from);
        if (to) jobs.push([from, to]);
      }
    }
    await Promise.all(
      jobs.map(async ([from, to]) => {
        const { data: blob, error: dError } = await admin.storage
          .from("media")
          .download(from);
        if (dError || !blob)
          throw new Error(`copy photo: ${dError?.message}`);
        const { error: uError } = await admin.storage
          .from("media")
          .upload(to, blob, { contentType: "image/jpeg", upsert: true });
        if (uError) throw new Error(`copy photo: ${uError.message}`);
      }),
    );

    const first = appMap.get(apps[0].id);
    return Response.json({ appId: first });
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    return Response.json(
      { error: "Couldn't set up the demo copy. Try again." },
      { status: 502 },
    );
  }
}

import { z } from "zod";

import { readJson, requireUser } from "@/lib/api";
import { wipeGuestData } from "@/lib/guest-wipe";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({ who: z.enum(["maria", "cole"]) });

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
  // The guest's own key: templates are world-readable (demo_templates),
  // copies are owner-scoped. No secret needed — judges run this as-is.
  const db = auth.supabase;

  // IDs are minted up front so every table copies in ONE bulk insert
  // instead of row-by-row (~150 sequential round-trips was the slow part).
  try {
    // Clean room: a returning guest starts fresh instead of stacking copies.
    // Anonymous guests only — a signed-in user's own work is never touched.
    // Fresh guests skip the wipe entirely (one count query proves it).
    if (auth.user.is_anonymous) {
      const { count } = await db
        .from("apps")
        .select("id", { count: "exact", head: true })
        .eq("owner", guestUid);
      if ((count ?? 0) > 0) {
        await wipeGuestData(auth.supabase, guestUid);
      }
    }
    // ONE wave: every table by owner. Rows are filtered to the copied
    // apps in JS below, so orphans can never poison the copy.
    const [appsRes, wRes, vRes, rRes, mRes, eRes, fRes] = await Promise.all([
      db
        .from("apps")
        .select("*")
        .eq("owner", templateUid)
        .order("created_at", { ascending: true }),
      db.from("workshops").select("*").eq("owner", templateUid),
      db.from("app_versions").select("*").eq("owner", templateUid),
      db.from("records").select("*").eq("owner", templateUid),
      db.from("models").select("*").eq("owner", templateUid),
      db.from("examples").select("*").eq("owner", templateUid),
      db.from("photo_features").select("*").eq("owner", templateUid),
    ]);
    if (appsRes.error) {
      return Response.json({ error: "Couldn't load the demo." }, { status: 502 });
    }
    if (wRes.error) throw new Error(`load workshops: ${wRes.error.message}`);
    if (vRes.error) throw new Error(`load versions: ${vRes.error.message}`);
    if (rRes.error) throw new Error(`load records: ${rRes.error.message}`);
    if (mRes.error) throw new Error(`load models: ${mRes.error.message}`);
    if (eRes.error) throw new Error(`load examples: ${eRes.error.message}`);
    if (fRes.error) throw new Error(`load features: ${fRes.error.message}`);
    const apps = appsRes.data;
    const workshops = wRes.data;
    if (!apps.length) {
      return Response.json(
        { error: "The demo template is empty. Run the seed first." },
        { status: 404 },
      );
    }

    const workshopMap = new Map<string, string>();
    for (const w of workshops) workshopMap.set(w.id, crypto.randomUUID());
    {
      const { error } = await db.from("workshops").insert(
        workshops.map((w) => ({
          id: workshopMap.get(w.id)!,
          owner: guestUid,
          name: w.name,
          type: w.type,
        })),
      );
      if (error) throw new Error(`copy workshops: ${error.message}`);
    }

    const appMap = new Map<string, string>();
    for (const app of apps) appMap.set(app.id, crypto.randomUUID());
    {
      const { error } = await db.from("apps").insert(
        apps.map((app) => {
          const workshopId = workshopMap.get(app.workshop_id);
          if (!workshopId) throw new Error("copy app: workshop missing");
          return {
            id: appMap.get(app.id)!,
            owner: guestUid,
            name: app.name,
            spec: app.spec,
            version: app.version,
            private: app.private,
            kind: app.kind,
            position: app.position,
            workshop_id: workshopId,
            stage: app.stage,
            order_info: app.order_info,
            arrive_at: app.arrive_at,
            arrival_seen: app.arrival_seen,
            room_x: app.room_x,
            room_y: app.room_y,
          };
        }),
      );
      if (error) throw new Error(`copy apps: ${error.message}`);
    }

    const rewrite = rewriter(templateUid, guestUid, appMap);
    const artUpdates = apps.filter(
      (app) => app.look_path || app.blueprint_path || app.photos?.length,
    );
    await Promise.all(
      artUpdates.map((app) =>
        db
          .from("apps")
          .update({
            look_path: app.look_path ? rewrite(app.look_path) : null,
            blueprint_path: app.blueprint_path
              ? rewrite(app.blueprint_path)
              : null,
            photos: ((app.photos ?? []) as string[])
              .map((p: string) => rewrite(p))
              .filter((p): p is string => p !== null),
          })
          .eq("id", appMap.get(app.id)!),
      ),
    ).then((results) => {
      for (const r of results) {
        if (r.error) throw new Error(`copy art paths: ${r.error.message}`);
      }
    });

    const oldAppIds = apps.map((a) => a.id);
    const versions = vRes.data.filter((v) => appMap.has(v.app_id));
    const records = rRes.data.filter((r) => appMap.has(r.app_id));
    const models = mRes.data.filter((m) => appMap.has(m.app_id));

    const modelMap = new Map<string, string>();
    for (const m of models) modelMap.set(m.id, crypto.randomUUID());
    const examples = eRes.data.filter((e) => modelMap.has(e.model_id));

    const inserts: PromiseLike<{ error: unknown }>[] = [];
    if (versions.length > 0) {
      inserts.push(
        db.from("app_versions").insert(
          versions.map((v) => ({
            owner: guestUid,
            app_id: appMap.get(v.app_id)!,
            version: v.version,
            spec: v.spec,
            ops: v.ops,
            summary: v.summary,
            source: v.source,
          })),
        ) as unknown as PromiseLike<{ error: unknown }>,
      );
    }
    if (records.length > 0) {
      inserts.push(
        db.from("records").insert(
          records.map((r) => ({
            owner: guestUid,
            app_id: appMap.get(r.app_id)!,
            collection: r.collection,
            data: rewriteData(r.data, rewrite) as Record<string, never>,
          })),
        ) as unknown as PromiseLike<{ error: unknown }>,
      );
    }
    if (models.length > 0) {
      inserts.push(
        db.from("models").insert(
          models.map((m) => ({
            id: modelMap.get(m.id)!,
            owner: guestUid,
            app_id: appMap.get(m.app_id)!,
            block_id: m.block_id,
            labels: m.labels,
            dims: m.dims,
            w: m.w,
            b: m.b,
            rounds: m.rounds,
            curve: m.curve,
            feature_source: m.feature_source,
          })),
        ) as unknown as PromiseLike<{ error: unknown }>,
      );
    }
    const rewritableExamples = examples.filter((e) => {
      if (!e.photo_path) return true;
      return rewrite(e.photo_path) !== null;
    });
    // Feature cache rows travel with the photos, so the copy scores identically.
    const rewritableFeatures = fRes.data.filter(
      (f) => rewrite(f.photo_path) !== null,
    );
    if (rewritableFeatures.length > 0) {
      inserts.push(
        db.from("photo_features").insert(
          rewritableFeatures.map((f) => ({
            owner: guestUid,
            photo_path: rewrite(f.photo_path)!,
            x: f.x,
            source: f.source,
          })),
        ) as unknown as PromiseLike<{ error: unknown }>,
      );
    }
    const insertResults = await Promise.all(inserts);
    for (const r of insertResults) {
      if (r.error) {
        const message =
          r.error instanceof Error
            ? r.error.message
            : (r.error as { message?: string }).message;
        throw new Error(`copy rows: ${message}`);
      }
    }
    // Examples last: they key to the models copied above.
    if (rewritableExamples.length > 0) {
      const { error: exError } = await db.from("examples").insert(
        rewritableExamples.map((e) => ({
          owner: guestUid,
          model_id: modelMap.get(e.model_id)!,
          photo_path: e.photo_path ? rewrite(e.photo_path) : null,
          x: e.x,
          y: e.y,
        })),
      );
      if (exError) throw new Error(`copy examples: ${exError.message}`);
    }

    // Storage files: folders are template app ids, so list them directly
    // (one wave, no top-level listing), then server-side copy — the bytes
    // never travel through this server.
    const listings = await Promise.all(
      oldAppIds.map((id) => db.storage.from("media").list(`${templateUid}/${id}`)),
    );
    const jobs: [string, string][] = [];
    oldAppIds.forEach((id, i) => {
      const listing = listings[i];
      if (listing.error)
        throw new Error(`list storage: ${listing.error.message}`);
      for (const file of listing.data ?? []) {
        const from = `${templateUid}/${id}/${file.name}`;
        const to = rewrite(from);
        if (to) jobs.push([from, to]);
      }
    });
    await Promise.all(
      jobs.map(async ([from, to]) => {
        const { error: cError } = await db.storage
          .from("media")
          .copy(from, to);
        if (cError) throw new Error(`copy photo: ${cError.message}`);
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

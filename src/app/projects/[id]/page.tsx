import { Suspense } from "react";
import { notFound } from "next/navigation";
import DeleteAppButton from "@/app/DeleteAppButton";
import type { BoardDraft } from "@/components/design/BoardPanel";
import BoardPanelMount from "@/components/design/BoardPanelMount";
import ZoomMount from "@/components/design/ZoomMount";
import AppRuntime from "@/components/runtime/AppRuntime";
import { card } from "@/components/ui";
import {
  effectiveStage,
  mediumForKind,
  menuLines,
  runtimeInBoard,
  stageForVersion,
} from "@/lib/design/project-art";
import { signedUrls } from "@/lib/media";
import { listRecords, type DbRecord } from "@/lib/records";
import { parseSpec } from "@/lib/spec/schema";
import { createClient } from "@/lib/supabase/server";

export default async function AppPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: app, error } = await supabase
    .from("apps")
    .select(
      "id, name, version, spec, private, kind, stage, arrive_at, arrival_seen, order_info, owner, photos, look_path, blueprint_path, form_factor, workshop_id, workshops ( name, type )",
    )
    .eq("id", id)
    .single();
  if (error || !app) notFound();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || app.owner !== user.id) notFound();
  const workshop = Array.isArray(app.workshops)
    ? app.workshops[0]
    : app.workshops;

  const parsed = parseSpec(app.spec);
  if (!parsed.ok) {
    return (
      <div className={`${card} p-5`}>
        <h2 className="font-display text-xl">
          This app&apos;s design didn&apos;t pass its checks
        </h2>
        <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm">
          {parsed.issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      </div>
    );
  }

  const spec = parsed.spec;
  const entries = await Promise.all(
    spec.collections.map(
      async (c) => [c.id, await listRecords(supabase, id, c.id)] as const,
    ),
  );
  const records: Record<string, DbRecord[]> = Object.fromEntries(entries);
  const { data: versions } = await supabase
    .from("app_versions")
    .select("version, summary")
    .eq("app_id", id)
    .order("version", { ascending: true });
  const drafts: BoardDraft[] = (versions ?? []).map((v) => ({
    n: v.version,
    label: v.summary ?? `Version ${v.version}`,
    stage: stageForVersion(v.version),
  }));
  const medium = mediumForKind(app.kind ?? "software");
  const stage = effectiveStage(app.stage, app.version);
  // At software's Prototype step the live runtime moves into the board;
  // everywhere else it renders below the board as before.
  const spotlight = runtimeInBoard(medium, stage);
  const runtimeApp = {
    id: app.id,
    name: app.name,
    version: app.version,
    private: app.private ?? false,
    kind: mediumForKind(app.kind ?? "software"),
    workshop: workshop ? { id: app.workshop_id, name: workshop.name } : null,
  };
  const { data: noteRows } = await supabase
    .from("project_notes")
    .select("id, who, part, topic, text")
    .eq("app_id", id)
    .order("created_at", { ascending: true });
  const notes = (noteRows ?? []).map((n) => ({
    id: n.id,
    who: (n.who === "apprentice" ? "apprentice" : "you") as
      | "you"
      | "apprentice",
    part: n.part,
    topic: n.topic,
    text: n.text,
  }));
  const orderInfo = app.order_info as {
    vendors?: { name?: string; contact?: string; address?: string }[];
    sent_at?: string;
    arrival_photo?: string;
    target?: string;
  } | null;
  const vendors = Array.isArray(orderInfo?.vendors)
    ? orderInfo.vendors.filter(
        (v): v is { name: string; contact: string; address: string } =>
          typeof v?.name === "string",
      )
    : [];
  const order =
    vendors.length > 0
      ? {
          vendors: vendors.map((v) => ({
            name: v.name,
            contact: typeof v.contact === "string" ? v.contact : "web",
            address: typeof v.address === "string" ? v.address : "",
          })),
          sentAt:
            typeof orderInfo?.sent_at === "string" ? orderInfo.sent_at : null,
        }
      : null;
  const shipTarget =
    typeof orderInfo?.target === "string" ? orderInfo.target : undefined;
  const arrivalPhotoPath =
    typeof orderInfo?.arrival_photo === "string"
      ? orderInfo.arrival_photo
      : null;
  const arrivalPhotoUrl = arrivalPhotoPath
    ? ((await signedUrls(supabase, [arrivalPhotoPath]))[arrivalPhotoPath] ??
      null)
    : null;
  const lines =
    medium === "print" ? menuLines(spec.collections, records) : undefined;
  const galleryPaths: string[] = app.photos ?? [];
  const gallerySigned = await signedUrls(supabase, galleryPaths);
  const photoUrls = galleryPaths.map((p) => gallerySigned[p] ?? "");
  const artPaths = [app.look_path, app.blueprint_path].filter(
    (p): p is string => !!p,
  );
  const artSigned = artPaths.length
    ? await signedUrls(supabase, artPaths)
    : ({} as Record<string, string>);
  const lookUrl = app.look_path ? (artSigned[app.look_path] ?? null) : null;
  const sketchUrl = app.blueprint_path
    ? (artSigned[app.blueprint_path] ?? null)
    : null;

  return (
    <ZoomMount depth={3}>
      {workshop && app.workshop_id && (
        <BoardPanelMount
          appId={app.id}
          project={{ name: app.name, medium, stage }}
          drafts={drafts}
          notes={notes}
          tagline={spec.tagline}
          backTo={{ id: app.workshop_id, name: workshop.name }}
          newIn={app.workshop_id}
          workshopType={workshop.type ?? "other"}
          order={order}
          arriveAt={app.arrive_at}
          arrivalPhotoUrl={arrivalPhotoUrl}
          showArrival={stage === "arrived" && !app.arrival_seen}
          lines={lines}
          shipTarget={shipTarget}
          photoUrls={photoUrls}
          photoPaths={galleryPaths}
          lookMissing={!app.look_path}
          sketchMissing={!app.blueprint_path}
          sketchUrl={sketchUrl}
          lookUrl={lookUrl}
          version={`${app.id}@${app.version}@${app.stage ?? ""}`}
          runtime={
            spotlight
              ? { app: runtimeApp, spec, records }
              : undefined
          }
          wireScreens={spec.screens.map((s) => ({
            title: s.title,
            blocks: s.blocks.map((b) => ({ type: b.type, title: b.title })),
          }))}
          formFactor={
            app.form_factor === "mobile" || app.form_factor === "desktop"
              ? app.form_factor
              : null
          }
        />
      )}
      {!spotlight && stage !== "sketch" && (
        <div id="app-preview" style={{ scrollMarginTop: 12 }}>
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <AppRuntime app={runtimeApp} spec={spec} records={records} />
        </Suspense>
        </div>
      )}
      {stage === "sketch" && (
        <div className="b-scope">
          <section
            id="app-preview"
            className="card dashed"
            style={{ marginTop: 24, scrollMarginTop: 12 }}
          >
            <h2 className="h2">
              The working {medium === "software" ? "app" : "prototype"} arrives
              at the next step.
            </h2>
            <p className="small" style={{ marginTop: 4 }}>
              Finish the sketch first — the apprentice is still drawing.
            </p>
          </section>
        </div>
      )}
      {workshop && app.workshop_id && (
        <div className="b-scope">
          <section className="card" style={{ marginTop: 24 }}>
            <h2 className="h2">Done with this project?</h2>
            <p className="small" style={{ marginTop: 4 }}>
              Deleting removes the project and everything in it —
              records, drafts, and notes. This can&apos;t be undone.
            </p>
            <div style={{ marginTop: 8 }}>
              <DeleteAppButton
                appId={app.id}
                redirectTo={`/workshops/${app.workshop_id}`}
              />
            </div>
          </section>
        </div>
      )}
    </ZoomMount>
  );
}

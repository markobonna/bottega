import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { BoardDraft } from "@/components/design/BoardPanel";
import BoardPanelMount from "@/components/design/BoardPanelMount";
import ZoomMount from "@/components/design/ZoomMount";
import AppRuntime from "@/components/runtime/AppRuntime";
import { card } from "@/components/ui";
import {
  effectiveStage,
  mediumForKind,
  menuLines,
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
      "id, name, version, spec, private, kind, stage, arrive_at, arrival_seen, order_info, workshop_id, workshops ( name, type )",
    )
    .eq("id", id)
    .single();
  if (error || !app) notFound();
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
          version={`${app.id}@${app.version}@${app.stage ?? ""}`}
        />
      )}
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <AppRuntime
          app={{
            id: app.id,
            name: app.name,
            version: app.version,
            private: app.private ?? false,
            kind: mediumForKind(app.kind ?? "software"),
            workshop: workshop
              ? { id: app.workshop_id, name: workshop.name }
              : null,
          }}
          spec={spec}
          records={records}
        />
      </Suspense>
    </ZoomMount>
  );
}

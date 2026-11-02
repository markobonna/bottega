import { notFound } from "next/navigation";
import { btn } from "@/components/ui";
import WorkshopScreenMount from "@/components/design/WorkshopScreenMount";
import ZoomMount from "@/components/design/ZoomMount";
import { effectiveStage, mediumForKind } from "@/lib/design/project-art";
import { signedUrls } from "@/lib/media";
import { inlineFiles, parseSoftwareFilesState } from "@/lib/software-build";
import { parseSpec } from "@/lib/spec/schema";
import { createClient } from "@/lib/supabase/server";
import { createSample } from "../../actions";
import { signPhotoPaths } from "../../projects/[id]/actions";

export default async function WorkshopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: workshop } = await supabase
    .from("workshops")
    .select("id, name, type, owner, photo_path")
    .eq("id", id)
    .maybeSingle();
  if (!workshop) notFound();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || workshop.owner !== user.id) notFound();
  const { data: apps, error } = await supabase
    .from("apps")
    .select(
      "id, name, version, updated_at, spec, kind, stage, look_path, blueprint_path, photos, room_x, room_y, build_files",
    )
    .eq("workshop_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const artPaths = (apps ?? []).flatMap((a) =>
    [a.look_path, a.blueprint_path].filter((p): p is string => !!p),
  );
  const signed = await signPhotoPaths(artPaths);
  const urls = signed.ok ? signed.urls : {};
  const roomPhotoUrl = workshop.photo_path
    ? ((await signedUrls(supabase, [workshop.photo_path]))[
        workshop.photo_path
      ] ?? null)
    : null;

  const galleryPaths = (apps ?? []).flatMap((a) =>
    (a.photos ?? []).length > 0 ? [(a.photos ?? []).slice(-1)[0]] : [],
  );
  const galleryUrls =
    galleryPaths.length > 0
      ? await signedUrls(supabase, galleryPaths)
      : ({} as Record<string, string>);
  const roomProjects = (apps ?? []).map((a) => {
    const parsed = parseSpec(a.spec);
    const newest = (a.photos ?? []).slice(-1)[0];
    const imageUrl =
      (newest ? galleryUrls[newest] : undefined) ??
      (a.look_path ? urls[a.look_path] : undefined) ??
      null;
    // Software skips portrait art (the app IS the visual), so its card
    // shows a static snapshot of the real design instead of a tag.
    const designFiles =
      !imageUrl && a.kind === "software"
        ? (parseSoftwareFilesState(a.build_files)?.files ?? []).filter(
            (f) => f.path === "index.html" || f.path === "styles.css",
          )
        : [];
    const snapshotDoc =
      designFiles.some((f) => f.path === "index.html")
        ? inlineFiles(designFiles)
        : null;
    return {
      id: a.id,
      name: a.name,
      medium: mediumForKind(a.kind ?? "software"),
      stage: effectiveStage(a.stage, a.version),
      tagline: parsed.ok ? parsed.spec.tagline : "",
      imageUrl,
      snapshotDoc,
      roomX: a.room_x ?? null,
      roomY: a.room_y ?? null,
    };
  });
  const sceneVersion = `${workshop.id}:${(apps ?? []).map((a, i) => `${i}:${a.id}@${a.version}`).join(",")}`;

  return (
    <ZoomMount depth={2}>
      <WorkshopScreenMount
        workshop={{
          id: workshop.id,
          name: workshop.name,
          type: workshop.type ?? "other",
        }}
        projects={roomProjects}
        version={sceneVersion}
        roomPhotoUrl={roomPhotoUrl}
      />

      <section aria-label="Samples" className="mt-8">
        <h2 className="font-display text-lg">Or start from a sample</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <form action={createSample.bind(null, "maria", workshop.id)}>
            <button type="submit" className={btn.quiet}>
              A bakery
            </button>
          </form>
          <form action={createSample.bind(null, "cole", workshop.id)}>
            <button type="submit" className={btn.quiet}>
              A furniture restorer
            </button>
          </form>
        </div>
      </section>

    </ZoomMount>
  );
}

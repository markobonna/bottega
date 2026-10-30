import WorldScreen from "@/components/design/WorldScreen";
import type { SceneWorkshop } from "@/components/design/WorldScene";
import ZoomMount from "@/components/design/ZoomMount";
import { effectiveStage } from "@/lib/design/project-art";
import { createClient } from "@/lib/supabase/server";
import DeleteWorkshopButton from "./DeleteWorkshopButton";

export default async function Home() {
  const supabase = await createClient();
  const { data: workshops, error } = await supabase
    .from("workshops")
    .select("id, name, type")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const { data: apps } = await supabase
    .from("apps")
    .select("id, name, workshop_id, updated_at, version, stage");

  const scene: SceneWorkshop[] = (workshops ?? []).map((w, i) => {
    const projects = (apps ?? []).filter((a) => a.workshop_id === w.id);
    const times = projects
      .map((a) => (a.updated_at ? new Date(a.updated_at).getTime() : NaN))
      .filter((t) => !Number.isNaN(t));
    return {
      id: w.id,
      name: w.name,
      type: w.type,
      slot: i,
      stage: "built",
      lastActivity: times.length ? Math.max(...times) : null,
      projects: projects.map((a) => ({
        id: a.id,
        name: a.name,
        stage: effectiveStage(a.stage, a.version),
      })),
    };
  });
  const version = JSON.stringify(
    scene.map((w) => [
      w.id,
      w.type,
      w.projects.map((p) => `${p.id}@${p.stage}`).join(","),
      w.lastActivity,
    ]),
  );

  return (
    <ZoomMount depth={1}>
      <WorldScreen workshops={scene} version={version} />

      {(workshops ?? []).length > 0 && (
        <section aria-label="Manage workshops" className="mt-4">
          <h2 className="font-display text-lg">Manage workshops</h2>
          <div className="mt-2 flex flex-col gap-3">
            {(workshops ?? []).map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="truncate text-sm">{w.name}</span>
                <DeleteWorkshopButton workshopId={w.id} />
              </div>
            ))}
          </div>
        </section>
      )}
    </ZoomMount>
  );
}

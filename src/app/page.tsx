import Link from "next/link";
import { Label, btn, card } from "@/components/ui";
import WorldScene, {
  type SceneWorkshop,
} from "@/components/design/WorldScene";
import ZoomMount from "@/components/design/ZoomMount";
import { WORKSHOP_TYPE_OPTIONS } from "@/lib/design/workshop-types";
import { createClient } from "@/lib/supabase/server";
import DeleteWorkshopButton from "./DeleteWorkshopButton";
import { createWorkshop } from "./actions";

const inputCls =
  "w-full rounded-[12px] border-[1.5px] border-line bg-card px-4 py-2.5 text-ink placeholder:text-muted";

function StartWorkshopForm() {
  return (
    <form
      id="start-workshop"
      action={createWorkshop}
      className="mt-2 flex scroll-mt-24 flex-col gap-2"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="workshop-name">Name your workshop</Label>
        <input
          id="workshop-name"
          name="name"
          type="text"
          required
          maxLength={40}
          placeholder="Bakery"
          autoComplete="off"
          className={inputCls}
        />
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-[0.72rem] font-bold uppercase tracking-[0.09em] text-muted">
          What kind of place is it? (optional)
        </legend>
        <div className="flex flex-wrap gap-2">
          {WORKSHOP_TYPE_OPTIONS.map((o) => (
            <label key={o.id}>
              <input type="radio" name="type" value={o.id} className="peer sr-only" />
              <span
                className={`${btn.quiet} ${btn.small} inline-block peer-checked:bg-ink peer-checked:text-paper`}
              >
                {o.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" className={`${btn.primary} w-full`}>
        Start a Workshop
      </button>
    </form>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const { data: workshops, error } = await supabase
    .from("workshops")
    .select("id, name, type")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const { data: apps } = await supabase
    .from("apps")
    .select("id, name, workshop_id, updated_at");

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
      projects: projects.map((a) => ({ id: a.id, name: a.name })),
    };
  });
  const version = JSON.stringify(
    scene.map((w) => [w.id, w.type, w.projects.length, w.lastActivity]),
  );

  if ((workshops ?? []).length === 0) {
    return (
      <ZoomMount depth={1}>
        <h1 className="font-display text-3xl">Start a Workshop.</h1>
        <p className="text-muted mt-2">
          A workshop holds your projects — one for the bakery, one for the
          dance studio, whatever your life needs.
        </p>
        <div className="mt-4">
          <WorldScene workshops={scene} version={version} />
        </div>
        <div className="mt-4">
          <StartWorkshopForm />
        </div>
      </ZoomMount>
    );
  }

  return (
    <ZoomMount depth={1}>
      <h1 className="font-display text-3xl">Your workshops.</h1>
      <div className="mt-4">
        <WorldScene workshops={scene} version={version} />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {(workshops ?? []).map((w) => {
          const n = scene.find((s) => s.id === w.id)?.projects.length ?? 0;
          return (
            <div key={w.id} className={`${card} p-4`}>
              <Link href={`/workshops/${w.id}`}>
                <span className="font-display block truncate text-xl">
                  {w.name}
                </span>
                <span className="text-muted block text-sm">
                  {n === 1 ? "1 project" : `${n} projects`}
                </span>
              </Link>
              <div className="mt-3">
                <DeleteWorkshopButton workshopId={w.id} />
              </div>
            </div>
          );
        })}
      </div>

      <section aria-label="Start another workshop" className="mt-8">
        <h2 className="font-display text-lg">Start a new workshop</h2>
        <StartWorkshopForm />
      </section>
    </ZoomMount>
  );
}

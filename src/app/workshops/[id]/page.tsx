import Link from "next/link";
import { notFound } from "next/navigation";
import { btn, card } from "@/components/ui";
import ProjectBuildButton from "@/components/workshop/ProjectBuildButton";
import { parseSpec } from "@/lib/spec/schema";
import { createClient } from "@/lib/supabase/server";
import DeleteWorkshopButton from "../../DeleteWorkshopButton";
import DeleteAppButton from "../../DeleteAppButton";
import { createSample } from "../../actions";
import { signPhotoPaths } from "../../projects/[id]/actions";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function WorkshopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: workshop } = await supabase
    .from("workshops")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!workshop) notFound();
  const { data: apps, error } = await supabase
    .from("apps")
    .select("id, name, version, updated_at, spec, kind, look_path, blueprint_path")
    .eq("workshop_id", id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  const artPaths = (apps ?? []).flatMap((a) =>
    [a.look_path, a.blueprint_path].filter((p): p is string => !!p),
  );
  const signed = await signPhotoPaths(artPaths);
  const urls = signed.ok ? signed.urls : {};

  return (
    <div>
      <Link
        href="/"
        className="text-muted text-sm underline-offset-4 hover:underline"
      >
        ← Workshops
      </Link>
      <h1 className="font-display mt-2 truncate text-3xl">{workshop.name}</h1>

      <div className="mt-4 flex flex-col gap-3">
        {(apps ?? []).length === 0 && (
          <p className="text-muted">
            No projects yet. Describe your first one below.
          </p>
        )}
        {(apps ?? []).map((a) => {
          const parsed = parseSpec(a.spec);
          const look = parsed.ok
            ? { icon: parsed.spec.look.icon, tagline: parsed.spec.tagline }
            : { icon: "📦", tagline: "This project needs attention." };
          const lookUrl = a.look_path ? urls[a.look_path] : undefined;
          const blueprintUrl = a.blueprint_path
            ? urls[a.blueprint_path]
            : undefined;
          return (
            <div key={a.id} className={`${card} p-4`}>
              <Link href={`/projects/${a.id}`} className="flex items-center gap-3">
                <span aria-hidden="true" className="text-3xl">
                  {look.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-display block truncate text-xl">
                    {a.name}
                  </span>
                  <span className="text-muted block truncate text-sm">
                    {look.tagline}
                  </span>
                  <span className="text-muted mt-1 block text-xs">
                    v{a.version} · updated {timeAgo(a.updated_at ?? "")} ·{" "}
                    {a.kind}
                  </span>
                </span>
              </Link>
              {(lookUrl || blueprintUrl) && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {lookUrl && (
                    <img
                      src={lookUrl}
                      alt={`${a.name} look`}
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                  )}
                  {blueprintUrl && (
                    <img
                      src={blueprintUrl}
                      alt={`${a.name} blueprint`}
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                  )}
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <ProjectBuildButton appId={a.id} />
                <DeleteAppButton appId={a.id} />
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href={`/new?workshop=${workshop.id}`}
        className={`${btn.primary} mt-6 w-full`}
      >
        Describe a new project
      </Link>

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

      <section aria-label="Delete workshop" className="mt-8">
        <DeleteWorkshopButton workshopId={workshop.id} />
      </section>
    </div>
  );
}

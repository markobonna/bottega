import Link from "next/link";
import { btn, card } from "@/components/ui";
import { parseSpec } from "@/lib/spec/schema";
import { createClient } from "@/lib/supabase/server";
import { createSample } from "./actions";
import DeleteAppButton from "./DeleteAppButton";

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

export default async function Home() {
  const supabase = await createClient();
  const { data: apps, error } = await supabase
    .from("apps")
    .select("id, name, version, updated_at, spec")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (
    <div>
      <h1 className="font-display">Your workshop.</h1>

      <div className="mt-4 flex flex-col gap-3">
        {(apps ?? []).length === 0 && (
          <p className="text-muted">
            Tell Bottega about your work and it builds you an app.
          </p>
        )}
        {(apps ?? []).map((a) => {
          const parsed = parseSpec(a.spec);
          const look = parsed.ok
            ? { icon: parsed.spec.look.icon, tagline: parsed.spec.tagline }
            : { icon: "📦", tagline: "This app needs attention." };
          return (
            <div key={a.id} className={`${card} p-4`}>
              <Link href={`/apps/${a.id}`} className="flex items-center gap-3">
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
                    v{a.version} · updated {timeAgo(a.updated_at ?? "")}
                  </span>
                </span>
              </Link>
              <div className="mt-3">
                <DeleteAppButton appId={a.id} />
              </div>
            </div>
          );
        })}
      </div>

      <Link href="/new" className={`${btn.primary} mt-6 w-full`}>
        Describe a new app
      </Link>

      <section aria-label="Samples" className="mt-8">
        <h2 className="font-display text-lg">Or start from a sample</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <form action={createSample.bind(null, "maria")}>
            <button type="submit" className={btn.quiet}>
              A bakery
            </button>
          </form>
          <form action={createSample.bind(null, "cole")}>
            <button type="submit" className={btn.quiet}>
              A furniture restorer
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

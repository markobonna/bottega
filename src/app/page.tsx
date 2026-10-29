import Link from "next/link";
import { Label, btn, card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import DeleteWorkshopButton from "./DeleteWorkshopButton";
import { createWorkshop } from "./actions";

const inputCls =
  "w-full rounded-[12px] border-[1.5px] border-line bg-card px-4 py-2.5 text-ink placeholder:text-muted";

function StartWorkshopForm() {
  return (
    <form action={createWorkshop} className="mt-2 flex flex-col gap-2">
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
    .select("id, name")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const { data: apps } = await supabase.from("apps").select("id, workshop_id");
  const counts = new Map<string, number>();
  for (const a of apps ?? []) {
    counts.set(a.workshop_id, (counts.get(a.workshop_id) ?? 0) + 1);
  }

  if ((workshops ?? []).length === 0) {
    return (
      <div>
        <h1 className="font-display text-3xl">Start a Workshop.</h1>
        <p className="text-muted mt-2">
          A workshop holds your projects — one for the bakery, one for the
          dance studio, whatever your life needs.
        </p>
        <div className="mt-4">
          <StartWorkshopForm />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl">Your workshops.</h1>

      <div className="mt-4 flex flex-col gap-3">
        {(workshops ?? []).map((w) => {
          const n = counts.get(w.id) ?? 0;
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
    </div>
  );
}

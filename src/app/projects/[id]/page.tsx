import { Suspense } from "react";
import { notFound } from "next/navigation";
import ZoomMount from "@/components/design/ZoomMount";
import AppRuntime from "@/components/runtime/AppRuntime";
import { card } from "@/components/ui";
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
    .select("id, name, version, spec, private, kind, workshop_id, workshops ( name )")
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

  return (
    <ZoomMount depth={3}>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <AppRuntime
          app={{
            id: app.id,
            name: app.name,
            version: app.version,
            private: app.private ?? false,
            kind: app.kind === "hardware" ? "hardware" : "software",
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

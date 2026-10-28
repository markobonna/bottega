import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { signedUrls } from "@/lib/media";
import { parseSpec } from "@/lib/spec/schema";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  robots: { index: false },
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: share } = await admin
    .from("shares")
    .select("app_id, record_id")
    .eq("token", token)
    .eq("revoked", false)
    .maybeSingle();
  if (!share?.app_id || !share.record_id) notFound();

  const { data: record } = await admin
    .from("records")
    .select("collection, data")
    .eq("id", share.record_id)
    .eq("app_id", share.app_id)
    .maybeSingle();
  if (!record) notFound();

  const { data: app } = await admin
    .from("apps")
    .select("name, spec")
    .eq("id", share.app_id)
    .maybeSingle();
  if (!app) notFound();
  const parsed = parseSpec(app.spec);
  if (!parsed.ok) notFound();
  const compare = parsed.spec.screens
    .flatMap((s) => s.blocks)
    .find((b) => b.type === "compare" && b.collection === record.collection);
  if (!compare || compare.type !== "compare") notFound();

  const data = (record.data ?? {}) as Record<string, unknown>;
  const beforePath =
    typeof data[compare.before] === "string" ? data[compare.before] : null;
  const afterPath =
    typeof data[compare.after] === "string" ? data[compare.after] : null;
  const caption =
    compare.caption !== undefined && typeof data[compare.caption] === "string"
      ? (data[compare.caption] as string)
      : null;
  const urls = await signedUrls(
    admin,
    [beforePath, afterPath].filter((p): p is string => p !== null),
    600,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="text-3xl">
          {parsed.spec.look.icon}
        </span>
        <span className="font-display text-xl">{app.name}</span>
      </div>
      {caption !== null && (
        <h1 className="font-display text-2xl">{caption}</h1>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        {(
          [
            { label: "Before", path: beforePath },
            { label: "After", path: afterPath },
          ] as { label: string; path: string | null }[]
        ).map((s) => (
          <figure key={s.label} className="flex flex-1 flex-col gap-1.5">
            <figcaption className="text-[0.72rem] font-bold tracking-[0.09em] text-muted uppercase">
              {s.label}
            </figcaption>
            {s.path !== null && urls[s.path] ? (
              <img
                src={urls[s.path]}
                alt={`${s.label} photo`}
                className="w-full rounded-[12px]"
              />
            ) : (
              <div className="checker flex min-h-32 w-full items-center justify-center rounded-[12px] p-4 text-sm text-muted">
                No {s.label.toLowerCase()} photo yet
              </div>
            )}
          </figure>
        ))}
      </div>
      <footer className="text-muted text-center text-sm">Made with Bottega</footer>
    </div>
  );
}

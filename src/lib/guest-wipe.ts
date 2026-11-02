import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/**
 * Delete everything a guest made: apps (cascading to versions, records,
 * models, examples, notes, shares, events), workshops, cached photo
 * features, and their media files. Runs on the guest's own session —
 * RLS confines every delete to their rows, so no secret is needed.
 * Callers must gate on is_anonymous — real accounts are never wiped.
 */
export async function wipeGuestData(
  db: SupabaseClient<Database>,
  guestUid: string,
): Promise<void> {
  // Wave 1: independent deletes plus the top-level storage listing.
  const [appsRes, featRes, topList] = await Promise.all([
    db.from("apps").delete().eq("owner", guestUid),
    db.from("photo_features").delete().eq("owner", guestUid),
    db.storage.from("media").list(guestUid),
  ]);
  if (appsRes.error) throw new Error(`wipe apps: ${appsRes.error.message}`);
  if (featRes.error)
    throw new Error(`wipe features: ${featRes.error.message}`);
  if (topList.error) throw new Error(`wipe storage: ${topList.error.message}`);
  // Wave 2: workshops (after apps: FK) plus per-folder listings.
  const folders = topList.data ?? [];
  const [wRes, ...listings] = await Promise.all([
    db.from("workshops").delete().eq("owner", guestUid),
    ...folders.map((folder) =>
      db.storage.from("media").list(`${guestUid}/${folder.name}`),
    ),
  ]);
  if (wRes.error) throw new Error(`wipe workshops: ${wRes.error.message}`);
  const removals: PromiseLike<{ error: unknown }>[] = [];
  (folders ?? []).forEach((folder, i) => {
    const listing = listings[i];
    if (listing.error)
      throw new Error(`wipe storage: ${listing.error.message}`);
    if (listing.data?.length) {
      removals.push(
        db.storage.from("media").remove(
          listing.data.map((f) => `${guestUid}/${folder.name}/${f.name}`),
        ) as unknown as PromiseLike<{ error: unknown }>,
      );
    }
  });
  const removed = await Promise.all(removals);
  for (const r of removed) {
    if (r.error) {
      const message =
        r.error instanceof Error
          ? r.error.message
          : (r.error as { message?: string }).message;
      throw new Error(`wipe storage: ${message}`);
    }
  }
}

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
  const { error: appsError } = await db
    .from("apps")
    .delete()
    .eq("owner", guestUid);
  if (appsError) throw new Error(`wipe apps: ${appsError.message}`);
  const { error: wError } = await db
    .from("workshops")
    .delete()
    .eq("owner", guestUid);
  if (wError) throw new Error(`wipe workshops: ${wError.message}`);
  const { error: fError } = await db
    .from("photo_features")
    .delete()
    .eq("owner", guestUid);
  if (fError) throw new Error(`wipe features: ${fError.message}`);
  const { data: folders, error: lError } = await db.storage
    .from("media")
    .list(guestUid);
  if (lError) throw new Error(`wipe storage: ${lError.message}`);
  for (const folder of folders ?? []) {
    const { data: files, error: flError } = await db.storage
      .from("media")
      .list(`${guestUid}/${folder.name}`);
    if (flError) throw new Error(`wipe storage: ${flError.message}`);
    if (files?.length) {
      const { error: rError } = await db.storage
        .from("media")
        .remove(files.map((f) => `${guestUid}/${folder.name}/${f.name}`));
      if (rError) throw new Error(`wipe storage: ${rError.message}`);
    }
  }
}

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** Delete everything a guest made: apps (cascading to versions, records,
 * models, examples, notes, shares, events), workshops, cached photo
 * features, and their media files. Callers must gate on is_anonymous —
 * real accounts are never wiped. */
export async function wipeGuestData(guestUid: string): Promise<void> {
  const admin = createAdminClient();
  const { error: appsError } = await admin
    .from("apps")
    .delete()
    .eq("owner", guestUid);
  if (appsError) throw new Error(`wipe apps: ${appsError.message}`);
  const { error: wError } = await admin
    .from("workshops")
    .delete()
    .eq("owner", guestUid);
  if (wError) throw new Error(`wipe workshops: ${wError.message}`);
  const { error: fError } = await admin
    .from("photo_features")
    .delete()
    .eq("owner", guestUid);
  if (fError) throw new Error(`wipe features: ${fError.message}`);
  const { data: folders, error: lError } = await admin.storage
    .from("media")
    .list(guestUid);
  if (lError) throw new Error(`wipe storage: ${lError.message}`);
  for (const folder of folders ?? []) {
    const { data: files, error: flError } = await admin.storage
      .from("media")
      .list(`${guestUid}/${folder.name}`);
    if (flError) throw new Error(`wipe storage: ${flError.message}`);
    if (files?.length) {
      const { error: rError } = await admin.storage
        .from("media")
        .remove(files.map((f) => `${guestUid}/${folder.name}/${f.name}`));
      if (rError) throw new Error(`wipe storage: ${rError.message}`);
    }
  }
}

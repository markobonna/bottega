"use server";

import { redirect } from "next/navigation";
import { wipeGuestData } from "@/lib/guest-wipe";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.is_anonymous) {
    // Exit = reset for demo guests. A failed wipe must not trap the user,
    // so log it and still sign out.
    try {
      await wipeGuestData(supabase, user.id);
    } catch (e) {
      console.error(e instanceof Error ? e.message : e);
    }
  }
  await supabase.auth.signOut();
  redirect("/sign-in");
}

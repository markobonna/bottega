"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import cole from "@/lib/spec/fixtures/cole.json";
import maria from "@/lib/spec/fixtures/maria.json";
import { createClient } from "@/lib/supabase/server";
import { createApp } from "@/lib/versions";

export async function createSample(kind: "maria" | "cole"): Promise<void> {
  const supabase = await createClient();
  const id = await createApp(supabase, kind === "maria" ? maria : cole, {
    source: "build",
    summary: "Loaded sample",
  });
  redirect(`/apps/${id}`);
}

export async function deleteApp(appId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("apps").delete().eq("id", appId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import cole from "@/lib/spec/fixtures/cole.json";
import maria from "@/lib/spec/fixtures/maria.json";
import { createClient } from "@/lib/supabase/server";
import { createApp } from "@/lib/versions";

async function ownWorkshop(supabase: Awaited<ReturnType<typeof createClient>>, workshopId: string) {
  const { data } = await supabase
    .from("workshops")
    .select("id")
    .eq("id", workshopId)
    .maybeSingle();
  if (!data) throw new Error("No such workshop.");
}

export async function createWorkshop(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 40) throw new Error("Name the workshop (1–40 chars).");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workshops")
    .insert({ name })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Couldn't create it.");
  redirect(`/workshops/${data.id}`);
}

export async function deleteWorkshop(workshopId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("workshops").delete().eq("id", workshopId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function createSample(
  kind: "maria" | "cole",
  workshopId: string,
): Promise<void> {
  const supabase = await createClient();
  await ownWorkshop(supabase, workshopId);
  const id = await createApp(supabase, kind === "maria" ? maria : cole, {
    source: "build",
    summary: "Loaded sample",
    workshopId,
  });
  redirect(`/projects/${id}`);
}

export async function deleteApp(appId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("apps").delete().eq("id", appId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

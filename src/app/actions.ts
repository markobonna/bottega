"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import cole from "@/lib/spec/fixtures/cole.json";
import maria from "@/lib/spec/fixtures/maria.json";
import {
  detectWorkshopType,
  isWorkshopTypeId,
} from "@/lib/design/workshop-types";
import { createClient } from "@/lib/supabase/server";
import { needApp, needWorkshop } from "@/lib/ownership";
import { createApp } from "@/lib/versions";

async function ownWorkshop(supabase: Awaited<ReturnType<typeof createClient>>, workshopId: string) {
  await needWorkshop(supabase, workshopId);
}

export async function createWorkshop(
  formData: FormData,
): Promise<{ id: string }> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 40)
    throw new Error("Name the workshop (1–40 chars).");
  const picked = String(formData.get("type") ?? "");
  const type = isWorkshopTypeId(picked) ? picked : detectWorkshopType(name);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workshops")
    .insert({ name, type })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Couldn't create it.");
  return { id: data.id };
}

export async function deleteWorkshop(workshopId: string): Promise<void> {
  const supabase = await createClient();
  await needWorkshop(supabase, workshopId);
  const { error } = await supabase.from("workshops").delete().eq("id", workshopId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function renameWorkshop(
  workshopId: string,
  name: string,
): Promise<void> {
  const clean = name.trim().slice(0, 40);
  if (!clean) throw new Error("Name the workshop (1–40 chars).");
  const supabase = await createClient();
  await ownWorkshop(supabase, workshopId);
  const { error } = await supabase
    .from("workshops")
    .update({ name: clean })
    .eq("id", workshopId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/workshops/${workshopId}`);
}

export async function setWorkshopType(
  workshopId: string,
  type: string,
): Promise<void> {
  if (!isWorkshopTypeId(type)) throw new Error("Bad workshop type.");
  const supabase = await createClient();
  await ownWorkshop(supabase, workshopId);
  const { error } = await supabase
    .from("workshops")
    .update({ type })
    .eq("id", workshopId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/workshops/${workshopId}`);
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
  await needApp(supabase, appId);
  const { error } = await supabase.from("apps").delete().eq("id", appId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

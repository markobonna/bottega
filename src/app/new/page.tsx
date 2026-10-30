import { redirect } from "next/navigation";
import BuildForm from "./form";
import ZoomMount from "@/components/design/ZoomMount";
import { createClient } from "@/lib/supabase/server";

export default async function NewAppPage({
  searchParams,
}: {
  searchParams: Promise<{ workshop?: string; idea?: string }>;
}) {
  const { workshop, idea } = await searchParams;
  if (!workshop) redirect("/");
  const supabase = await createClient();
  const { data } = await supabase
    .from("workshops")
    .select("id")
    .eq("id", workshop)
    .maybeSingle();
  if (!data) redirect("/");
  return (
    <ZoomMount depth={2}>
      <h1 className="font-display">Tell Bottega about your work.</h1>
      <BuildForm
        workshopId={workshop}
        initialText={(idea ?? "").slice(0, 1500)}
      />
    </ZoomMount>
  );
}

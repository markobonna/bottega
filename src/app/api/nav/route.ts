import { requireUser } from "@/lib/api";

export const runtime = "nodejs";

// Names for the header breadcrumbs. One call, cached client-side.
export async function GET(): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const [{ data: workshops }, { data: apps }] = await Promise.all([
    auth.supabase.from("workshops").select("id, name").eq("owner", auth.user.id),
    auth.supabase
      .from("apps")
      .select("id, name, workshop_id")
      .eq("owner", auth.user.id),
  ]);
  return Response.json({
    workshops: workshops ?? [],
    projects: (apps ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      workshopId: a.workshop_id,
    })),
  });
}

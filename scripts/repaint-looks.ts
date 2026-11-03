// Local only: repaint the template accounts' looks without reseeding.
// Usage: pnpm run repaint:looks [-- <kind>...]
// Needs SUPABASE_SECRET_KEY (real, not redacted) and MODEL_API_KEY in .env.local.
//
// Regenerates ONLY the art (look_path/blueprint_path) for the given
// kinds on maria/cole (default: all five); hardware rows also get
// their seed brief, and the Restoration Bench design is revised to
// the restored bench. Records, files, versions, notes and polaroid
// positions are untouched — unlike a full reseed.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { MissingKeyError } from "@/lib/meta";
import { renderLook, reviseArt } from "@/lib/project-look";
import { retryAsync } from "@/lib/retry";
import {
  RESTORATION_RESTORE_INSTRUCTION,
  SEED_HARDWARE_BRIEFS,
} from "@/lib/seed-briefs";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

const KINDS = ["print", "recipe", "music", "dance", "hardware"];
const EMAILS = ["maria@example.com", "cole@example.com"];

function env(name: string): string {
  const v = process.env[name];
  if (!v || v.startsWith("[")) {
    console.error(`${name} is missing or redacted in .env.local.`);
    process.exit(1);
  }
  return v;
}

async function signInAs(
  admin: SupabaseClient,
  url: string,
  anonKey: string,
  email: string,
): Promise<{ client: Client; uid: string }> {
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const actionLink = link.data?.properties?.action_link;
  if (link.error || !actionLink) {
    throw new Error(`link for ${email}: ${link.error?.message ?? "none"}`);
  }
  const u = new URL(actionLink);
  const token = u.searchParams.get("token_hash") ?? u.searchParams.get("token");
  if (!token) throw new Error(`link for ${email}: no token`);
  const client = createClient<Database>(url, anonKey);
  const { data, error } = await client.auth.verifyOtp({
    token_hash: token,
    type: "magiclink",
  });
  if (error || !data.user) {
    throw new Error(`verify ${email}: ${error?.message ?? "none"}`);
  }
  return { client, uid: data.user.id };
}

async function main(): Promise<void> {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  env("SUPABASE_SECRET_KEY");
  env("MODEL_API_KEY");
  const admin = createAdminClient() as unknown as SupabaseClient;
  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const kinds = only.length > 0 ? KINDS.filter((k) => only.includes(k)) : KINDS;
  if (only.length > 0 && kinds.length === 0) {
    console.error(`unknown kind(s): ${only.join(", ")} (want ${KINDS.join(", ")})`);
    process.exit(1);
  }
  let done = 0;
  for (const email of EMAILS) {
    const { client, uid } = await signInAs(admin, url, anonKey, email);
    const { data: apps, error } = await client
      .from("apps")
      .select("id, name, spec, kind")
      .in("kind", kinds)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`${email}: ${error.message}`);
    for (const app of apps ?? []) {
      const brief =
        app.kind === "hardware"
          ? (SEED_HARDWARE_BRIEFS[app.name ?? ""] ?? null)
          : null;
      const { lookPath, blueprintPath } = await retryAsync(
        () =>
          renderLook(client, uid, {
            id: app.id,
            spec: app.spec,
            kind: app.kind ?? "print",
            brief,
          }),
        {
          label: `repaint ${app.name ?? app.id}`,
          fatal: (e) => e instanceof MissingKeyError,
        },
      );
      const { error: upError } = await client
        .from("apps")
        .update({
          look_path: lookPath,
          blueprint_path: blueprintPath,
          ...(brief ? { brief } : {}),
        })
        .eq("id", app.id);
      if (upError) throw new Error(`save ${app.id}: ${upError.message}`);
      done += 1;
      console.log(`repainted (${app.kind}): ${app.name ?? app.id}`);
      if (app.kind === "hardware" && app.name === "Restoration Bench") {
        await retryAsync(
          () =>
            reviseArt(
              client,
              "portrait",
              lookPath,
              RESTORATION_RESTORE_INSTRUCTION,
              "hardware",
            ),
          {
            label: `restore ${app.name}`,
            fatal: (e) => e instanceof MissingKeyError,
          },
        );
        console.log(`restored: ${app.name}`);
      }
    }
  }
  console.log(`REPAINT PASS: ${done} project(s)`);
}

void main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

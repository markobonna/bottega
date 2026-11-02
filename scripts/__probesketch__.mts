// Local only, throwaway: prove the sketch→portrait pipeline end to end
// with live models. Signs in as maria, renders one sketch + one
// portrait to temp storage paths, deletes them after.
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { sniffImageFormat } from "@/lib/meta";
import {
  renderPortraitFromSketch,
  renderSketch,
} from "@/lib/project-look";

function env(name: string): string {
  const v = process.env[name];
  if (!v || v.startsWith("[")) {
    console.error(`${name} is missing or redacted.`);
    process.exit(1);
  }
  return v;
}

async function signInAs(
  admin: SupabaseClient,
  url: string,
  anonKey: string,
  email: string,
): Promise<SupabaseClient> {
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const actionLink = link.data?.properties?.action_link;
  if (link.error || !actionLink) {
    throw new Error(`link for ${email}: ${link.error?.message ?? "none"}`);
  }
  const u = new URL(actionLink);
  const token =
    u.searchParams.get("token_hash") ?? u.searchParams.get("token");
  const type = u.searchParams.get("type") ?? "magiclink";
  if (!token) throw new Error(`link for ${email}: no token`);
  const client = createClient(url, anonKey);
  const { error } = await client.auth.verifyOtp({
    type: type as "magiclink",
    token_hash: token,
  });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return client;
}

async function main(): Promise<void> {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  env("SUPABASE_SECRET_KEY");
  const admin = createAdminClient();
  const client = await signInAs(admin, url, anonKey, "maria@example.com");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("no user after sign-in");
  const spec = JSON.parse(
    readFileSync("src/lib/spec/fixtures/maria.json", "utf8"),
  );
  const probeId = `probe-${crypto.randomUUID().slice(0, 8)}`;
  const t0 = Date.now();
  const { sketchPath, sketchBytes } = await renderSketch(client, user.id, {
    id: probeId,
    spec,
    kind: "hardware",
  });
  console.log(
    `sketch ok in ${Math.round((Date.now() - t0) / 1000)}s:`,
    sketchPath,
    JSON.stringify(sniffImageFormat(sketchBytes)),
    `${sketchBytes.length} bytes`,
  );
  const t1 = Date.now();
  const lookPath = await renderPortraitFromSketch(
    client,
    user.id,
    { id: probeId, kind: "hardware" },
    sketchBytes,
  );
  console.log(
    `portrait ok in ${Math.round((Date.now() - t1) / 1000)}s:`,
    lookPath,
  );
  const { error: rmError } = await client.storage
    .from("media")
    .remove([sketchPath, lookPath]);
  if (rmError) console.log("cleanup warning:", rmError.message);
  console.log(
    "PROBE PASS: sketch then portrait, /images/edits accepted the upload",
  );
}

main().catch((e) => {
  console.error("PROBE FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});

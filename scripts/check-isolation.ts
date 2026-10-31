// Local only: prove RLS + storage isolation with two throwaway users,
// plus the demo-template exception Try-as relies on.
// Usage: pnpm run check:isolation
// Needs the real SUPABASE_SECRET_KEY (vercel env pull redacts it).
// Prints PASS/FAIL per check, exits non-zero on any FAIL, always deletes
// both users (and the test file) at the end.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import cole from "@/lib/spec/fixtures/cole.json";

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

function env(name: string): string {
  const v = process.env[name];
  if (!v || v.startsWith("[")) {
    console.error(`${name} is missing or redacted. See login-link.ts.`);
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
  const token = u.searchParams.get("token_hash") ?? u.searchParams.get("token");
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

  const tag = crypto.randomUUID().slice(0, 8);
  const emailA = `iso-a-${tag}@example.com`;
  const emailB = `iso-b-${tag}@example.com`;
  let failed = false;
  let aId: string | null = null;
  let bId: string | null = null;
  let filePath: string | null = null;
  let filePath2: string | null = null;

  try {
    for (const [label, email] of [
      ["A", emailA],
      ["B", emailB],
    ] as const) {
      const mk = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (mk.error || !mk.data.user) {
        throw new Error(`create ${label}: ${mk.error?.message ?? "none"}`);
      }
      if (label === "A") aId = mk.data.user.id;
      else bId = mk.data.user.id;
    }

    const a = await signInAs(admin, url, anonKey, emailA);
    const b = await signInAs(admin, url, anonKey, emailB);

    const ws = await a
      .from("workshops")
      .insert({ name: "iso", type: "garage" })
      .select("id")
      .single();
    if (ws.error || !ws.data) {
      throw new Error(`A insert workshop: ${ws.error?.message ?? "none"}`);
    }
    const app = await a
      .from("apps")
      .insert({ name: "iso", spec: cole, workshop_id: ws.data.id })
      .select("id")
      .single();
    if (app.error || !app.data) {
      throw new Error(`A insert app: ${app.error?.message ?? "none"}`);
    }
    const appId = app.data.id;
    const rec = await a
      .from("records")
      .insert({ app_id: appId, collection: "pieces", data: { name: "iso" } })
      .select("id")
      .single();
    if (rec.error || !rec.data) {
      throw new Error(`A insert record: ${rec.error?.message ?? "none"}`);
    }
    const recId = rec.data.id;
    filePath = `${aId}/${appId}/x.png`;
    // Two files: phase 1 downloads x.png (allowed as a template) and phase 2
    // must use a different object, because the storage edge can serve the
    // just-authorized bytes again after the permission is revoked.
    filePath2 = `${aId}/${appId}/x2.png`;
    for (const p of [filePath, filePath2]) {
      const up = await a.storage.from("media").upload(p, PNG, {
        contentType: "image/png",
      });
      if (up.error) throw new Error(`A upload: ${up.error.message}`);
    }

    const check = (name: string, pass: boolean, detail = "") => {
      console.log(
        `${name}: ${pass ? "PASS" : "FAIL"}${detail ? ` (${detail})` : ""}`,
      );
      if (!pass) failed = true;
    };

    // Phase 1: A registered as a demo template — B may read A's demo
    // rows (the Try-as path), but concierge rows stay private always.
    const reg = await admin
      .from("demo_templates")
      .insert({ owner: aId as string, label: "iso" });
    if (reg.error) throw new Error(`register template: ${reg.error.message}`);
    const tApps = await b.from("apps").select("id").eq("id", appId);
    check(
      "B lists A's app as template: 1 row",
      !tApps.error && tApps.data.length === 1,
      `${tApps.data?.length ?? "?"} rows`,
    );
    const tRec = await b.from("records").select("id").eq("id", recId);
    check(
      "B reads A's record as template: 1 row",
      !tRec.error && tRec.data.length === 1,
      `${tRec.data?.length ?? "?"} rows`,
    );
    const tDl = await b.storage.from("media").download(filePath);
    check(
      "B downloads A's file as template: ok",
      tDl.error === null,
      tDl.error ? "error" : "ok",
    );
    const cIns = await a
      .from("concierge_requests")
      .insert({ app_id: appId, email: emailA, note: "iso" });
    if (cIns.error) throw new Error(`A concierge insert: ${cIns.error.message}`);
    const cOwn = await a.from("concierge_requests").select("id");
    check(
      "A reads own concierge row: 1 row",
      !cOwn.error && cOwn.data.length === 1,
      `${cOwn.data?.length ?? "?"} rows`,
    );
    const cOther = await b.from("concierge_requests").select("id");
    check(
      "B reads A's concierge row: 0 rows",
      !cOther.error && cOther.data.length === 0,
      `${cOther.data?.length ?? "?"} rows`,
    );
    const unreg = await admin
      .from("demo_templates")
      .delete()
      .eq("owner", aId as string);
    if (unreg.error) throw new Error(`unregister: ${unreg.error.message}`);

    // Phase 2: ordinary users — B sees only own rows plus any seeded
    // templates, and nothing of A's.
    const apps = await b.from("apps").select("id, owner");
    const templates = await b.from("demo_templates").select("owner");
    const templateOwners = new Set(
      (templates.data ?? []).map((t) => t.owner as string),
    );
    const leaked = (apps.data ?? []).some(
      (r) => r.owner !== bId && !templateOwners.has(r.owner as string),
    );
    check(
      "B sees only own + template apps",
      !apps.error && !templates.error && !leaked,
      `${apps.data?.length ?? "?"} rows`,
    );
    if (templateOwners.size > 0) {
      check(
        "B sees seeded templates",
        (apps.data ?? []).some((r) =>
          templateOwners.has(r.owner as string),
        ),
        `${templateOwners.size} template(s)`,
      );
    }

    const one = await b.from("records").select("id").eq("id", recId);
    check(
      "B reads A's record: 0 rows",
      !one.error && one.data.length === 0,
      `${one.data?.length ?? "?"} rows`,
    );

    const upd = await b
      .from("records")
      .update({ data: { name: "pwned" } })
      .eq("id", recId)
      .select("id");
    check(
      "B updates A's record: 0 rows",
      !upd.error && upd.data.length === 0,
      `${upd.data?.length ?? "?"} rows`,
    );

    // The only way an insert errors under owner-RLS is a forged owner, so B
    // forges A's uid on a row pointed at A's app: must be rejected.
    const forgery = await b.from("records").insert({
      app_id: appId,
      collection: "pieces",
      data: { name: "forged" },
      owner: aId as string,
    });
    check(
      "B inserts into A's app with forged owner: rejected",
      forgery.error !== null,
      forgery.error ? "rejected" : "ALLOWED",
    );

    const dl = await b.storage.from("media").download(filePath2);
    check(
      "B downloads A's file: error",
      dl.error !== null,
      dl.error ? "error" : "ALLOWED",
    );

    const evil = await b.storage.from("media").upload(
      `${aId}/${appId}/evil.png`,
      PNG,
      { contentType: "image/png" },
    );
    check(
      "B uploads into A's folder: error",
      evil.error !== null,
      evil.error ? "error" : "ALLOWED",
    );
  } finally {
    if (aId) {
      await admin.from("demo_templates").delete().eq("owner", aId);
    }
    if (filePath) {
      const { error } = await admin.storage
        .from("media")
        .remove(
          [filePath, filePath2].filter((p): p is string => p !== null),
        );
      if (error) console.error(`cleanup file: ${error.message}`);
    }
    for (const [label, id] of [
      ["A", aId],
      ["B", bId],
    ] as const) {
      if (!id) continue;
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) console.error(`cleanup user ${label}: ${error.message}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e: unknown) => {
  console.error(`SETUP FAIL: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});

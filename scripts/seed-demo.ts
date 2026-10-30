// Local only: seed the maria/cole demo template accounts.
// Usage: pnpm run seed:demo
// Needs SUPABASE_SECRET_KEY (real, not redacted) and MODEL_API_KEY in .env.local.
// Photos come from scripts/demo-photos/ (gitignored, AI-generated).
// Re-running resets both accounts. Visitors never sign in to these;
// Try as Maria / Try as Cole copy them (Prompt 30).

import { readFileSync } from "node:fs";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { answer, createBrain, snapshot, train } from "@/lib/brain";
import { addRecord } from "@/lib/records";
import { segment } from "@/lib/sam";
import coleFixture from "@/lib/spec/fixtures/cole.json";
import mariaFixture from "@/lib/spec/fixtures/maria.json";
import type { AppSpec } from "@/lib/spec/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import {
  addExample,
  getOrCreateModel,
  saveModel,
  scorePhoto,
} from "@/lib/teach";
import { createApp } from "@/lib/versions";

type Client = SupabaseClient<Database>;

const PHOTOS = "scripts/demo-photos";

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
  const { error } = await client.auth.verifyOtp({
    type: "magiclink",
    token_hash: token,
  });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  const { data } = await client.auth.getUser();
  if (!data.user) throw new Error(`sign in ${email}: no user`);
  return { client, uid: data.user.id };
}

async function upload(
  client: Client,
  uid: string,
  appId: string,
  file: string,
): Promise<string> {
  const bytes = readFileSync(`${PHOTOS}/${file}`);
  const path = `${uid}/${appId}/${file}`;
  const { error } = await client.storage
    .from("media")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`upload ${file}: ${error.message}`);
  return path;
}

async function samCounts(
  file: string,
  nouns: string[],
  fallback: Record<string, number>,
): Promise<{ counts: Record<string, number>; live: boolean }> {
  if (!process.env.MODEL_API_KEY) return { counts: fallback, live: false };
  const dataUrl = `data:image/jpeg;base64,${readFileSync(`${PHOTOS}/${file}`).toString("base64")}`;
  const counts: Record<string, number> = {};
  for (const noun of nouns) {
    const r = await segment(dataUrl, noun);
    counts[noun] = r.objects.filter((o) => o.c >= 0.5).length;
  }
  return { counts, live: true };
}

function dayAgo(n: number): string {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
}

async function makeWorkshop(
  client: Client,
  name: string,
  type: string,
): Promise<string> {
  const { data, error } = await client
    .from("workshops")
    .insert({ name, type })
    .select("id")
    .single();
  if (error || !data) throw new Error(`workshop ${name}: ${error?.message}`);
  return data.id;
}

async function seedMaria(client: Client, uid: string): Promise<string> {
  const workshopId = await makeWorkshop(client, "Bakery", "cafe");
  await makeWorkshop(client, "Dance Studio", "studio");
  await makeWorkshop(client, "Office", "other");
  const appId = await createApp(client, mariaFixture, {
    source: "build",
    summary: "Demo seed",
    workshopId,
  });
  const spec = mariaFixture as AppSpec;
  const see = spec.screens
    .flatMap((s) => s.blocks)
    .find((b) => b.type === "see");
  if (!see || see.type !== "see") throw new Error("maria fixture: no see block");
  const nouns = see.nouns;

  const cafes: [string, string, number, number, string][] = [
    ["Café Moonbeam", "sourdough loaves", 12, 6, "picked up"],
    ["The Giggling Croissant", "butter croissants", 24, 5, "picked up"],
    ["Moonrise Diner", "cinnamon rolls", 18, 4, "ready"],
    ["Café Fable", "baguettes", 10, 3, "ready"],
    ["The Sleepy Badger", "rye loaves", 8, 2, "baking"],
    ["Blue Teapot Café", "blueberry muffins", 20, 1, "baking"],
    ["Café Wanderlust", "focaccia", 6, 0, "new"],
    ["The Jolly Crumb", "apple danishes", 15, 0, "new"],
  ];
  for (const [customer, item, quantity, daysAgo, status] of cafes) {
    await addRecord(client, appId, "orders", {
      customer,
      item,
      quantity,
      due: dayAgo(daysAgo),
      notes: "",
      status,
    });
  }

  for (const [file, notes] of [
    ["pantry-1.jpg", "Monday count"],
    ["pantry-2.jpg", "Thursday count"],
  ]) {
    const path = await upload(client, uid, appId, file);
    const fallback =
      file === "pantry-1.jpg"
        ? { jar: 5, "flour bag": 3 }
        : { jar: 3, "flour bag": 6 };
    const { counts, live } = await samCounts(file, nouns, fallback);
    console.log(
      `${file}: jars=${counts.jar} bags=${counts["flour bag"]} (${live ? "sam" : "fixed"})`,
    );
    await addRecord(client, appId, "pantry", {
      photo: path,
      jars: counts.jar ?? 0,
      bags: counts["flour bag"] ?? 0,
      notes,
    });
  }

  const sellPaths = [
    await upload(client, uid, appId, "loaf-sell-1.jpg"),
    await upload(client, uid, appId, "loaf-sell-2.jpg"),
    await upload(client, uid, appId, "loaf-sell-3.jpg"),
  ];
  const specials: [string, string, number][] = [
    ["Burnt honey morning bun", "Flaky bun, honey glaze, sea salt", 4.5],
    ["Rye chocolate cookie", "Dark rye, cocoa, rye whiskey soak", 3.75],
    ["Cardamom knot", "Swedish-style, pearl sugar", 4.25],
  ];
  for (let i = 0; i < specials.length; i++) {
    const [name, description, price] = specials[i];
    await addRecord(client, appId, "specials", {
      name,
      description,
      price,
      picture: sellPaths[i],
    });
  }
  return appId;
}

async function seedMariaTeach(
  client: Client,
  appId: string,
  uid: string,
): Promise<void> {
  if (!process.env.MODEL_API_KEY) {
    console.error(
      "no MODEL_API_KEY: cannot train the loaf checker (spark scoring has no offline substitute); failing instead of faking numbers.",
    );
    process.exit(1);
  }
  const spec = mariaFixture as AppSpec;
  const teach = spec.screens
    .flatMap((s) => s.blocks)
    .find((b) => b.type === "teach");
  if (!teach || teach.type !== "teach")
    throw new Error("maria fixture: no teach block");
  const labels = teach.labels as [string, string];
  const dims = teach.dims.map((d) => ({ name: d.name, hint: d.hint }));
  const { model } = await getOrCreateModel(
    client,
    appId,
    teach.id,
    labels,
    dims.map((d) => d.name),
    "spark",
  );
  const files: [string, 0 | 1][] = [
    ["loaf-sell-1.jpg", 1],
    ["loaf-sell-2.jpg", 1],
    ["loaf-sell-3.jpg", 1],
    ["loaf-nosell-1.jpg", 0],
    ["loaf-nosell-2.jpg", 0],
    ["loaf-nosell-3.jpg", 0],
  ];
  const brain = createBrain(
    labels,
    dims.map((d) => d.name),
  );
  for (const [file, y] of files) {
    const path = await upload(client, uid, appId, file);
    const { x } = await scorePhoto(client, path, dims);
    const row = await addExample(client, model.id, path, x, y);
    if (!row.x) throw new Error(`example ${file}: no features saved`);
    brain.train.push({ x: row.x, y });
    console.log(`${file}: y=${y} x=[${x.map((v) => v.toFixed(2)).join(",")}]`);
  }
  train(brain, 20);
  await saveModel(client, model.id, snapshot(brain));

  const trickPath = await upload(client, uid, appId, "loaf-trick.jpg");
  const trick = await scorePhoto(client, trickPath, dims);
  const verdict = answer(brain, trick.x);
  const conf = Math.round(verdict.conf * 100);
  console.log(`Trick loaf: ${verdict.label} at ${conf}%`);
  if (verdict.label !== "Sell" || conf < 85) {
    console.log("Pick a different trick photo");
    process.exit(1);
  }
}

async function seedCole(client: Client, uid: string): Promise<string> {
  const workshopId = await makeWorkshop(client, "House Interior", "other");
  await makeWorkshop(client, "Garage", "garage");
  await makeWorkshop(client, "Office", "other");
  const appId = await createApp(client, coleFixture, {
    source: "build",
    summary: "Demo seed",
    workshopId,
  });
  const spec = coleFixture as AppSpec;
  const see = spec.screens
    .flatMap((s) => s.blocks)
    .find((b) => b.type === "see");
  if (!see || see.type !== "see") throw new Error("cole fixture: no see block");

  const before = await upload(client, uid, appId, "chair-before.jpg");
  const after = await upload(client, uid, appId, "chair-after.jpg");
  const { counts, live } = await samCounts(
    "chair-before.jpg",
    see.nouns,
    { scratch: 4, chip: 2, "missing veneer": 1 },
  );
  console.log(
    `chair-before.jpg: scratches=${counts.scratch} chips=${counts.chip} veneer=${counts["missing veneer"]} (${live ? "sam" : "fixed"})`,
  );
  await addRecord(client, appId, "pieces", {
    name: "Oak dining chair",
    client: "Maple Street Inn",
    before,
    after,
    scratches: counts.scratch ?? 0,
    chips: counts.chip ?? 0,
    missing_veneer: counts["missing veneer"] ?? 0,
    notes: "Full strip and refinish",
    status: "done",
  });
  await addRecord(client, appId, "pieces", {
    name: "Walnut side table",
    client: "The Copper Kettle",
    notes: "Wobbly leg, dull finish",
    status: "assessing",
  });
  await addRecord(client, appId, "pieces", {
    name: "Pine bookshelf",
    client: "Fern & Fable",
    notes: "Two shelves sagging",
    status: "quoted",
  });
  return appId;
}

async function main(): Promise<void> {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  env("SUPABASE_SECRET_KEY");
  const admin = createAdminClient();

  const ids: Record<string, string> = {};
  let mariaClient: Client | null = null;
  let mariaApp = "";
  let mariaUid = "";
  for (const [who, email, seed] of [
    ["maria", "maria@example.com", seedMaria],
    ["cole", "cole@example.com", seedCole],
  ] as const) {
    const found = (await admin.auth.admin.listUsers()).data.users.find(
      (u) => u.email === email,
    );
    if (!found) {
      const mk = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (mk.error || !mk.data.user)
        throw new Error(`create ${email}: ${mk.error?.message ?? "none"}`);
    }
    const { client, uid } = await signInAs(admin, url, anonKey, email);
    await client.from("workshops").delete().eq("owner", uid);
    const appId = await seed(client, uid);
    ids[who] = uid;
    console.log(`${who} project ${appId}`);
    if (who === "maria") {
      mariaClient = client;
      mariaApp = appId;
      mariaUid = uid;
    }
  }

  if (!mariaClient) throw new Error("maria was not seeded");
  await seedMariaTeach(mariaClient, mariaApp, mariaUid);

  console.log("---");
  console.log("maria@example.com / cole@example.com reseeded");
  console.log("orders=8 pantry=2 specials=3 pieces=3 loaf examples=6");
  console.log(`TEMPLATE_MARIA_UID=${ids.maria}`);
  console.log(`TEMPLATE_COLE_UID=${ids.cole}`);
  console.log("SEED PASS");
}

void main();

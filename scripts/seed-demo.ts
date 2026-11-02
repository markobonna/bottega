// Local only: seed the maria/cole demo template accounts.
// Usage: pnpm run seed:demo
// Needs SUPABASE_SECRET_KEY (real, not redacted) and MODEL_API_KEY in .env.local.
// Photos come from scripts/demo-photos/ (gitignored, AI-generated).
// Re-running resets both accounts. Visitors never sign in to these;
// Try as Maria / Try as Cole copy them (Prompt 30).

import { readFileSync } from "node:fs";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { answer, createBrain, snapshot, train } from "@/lib/brain";
import { MissingKeyError } from "@/lib/meta";
import { renderLook } from "@/lib/project-look";
import { addRecord } from "@/lib/records";
import { retryAsync } from "@/lib/retry";
import { segment } from "@/lib/sam";
import coleFixture from "@/lib/spec/fixtures/cole.json";
import mariaFixture from "@/lib/spec/fixtures/maria.json";
import type { AppSpec, Block, Field } from "@/lib/spec/schema";
import { parseSpec } from "@/lib/spec/schema";
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
  await retryAsync(
    async () => {
      const { error } = await client.storage
        .from("media")
        .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
      if (error) throw new Error(`upload ${file}: ${error.message}`);
    },
    { label: `upload ${file}` },
  );
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
    const r = await retryAsync(() => segment(dataUrl, noun), {
      label: `see ${file}:${noun}`,
      fatal: (e) => e instanceof MissingKeyError,
    });
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

let looksSkipped = false;

interface PendingLook {
  client: Client;
  uid: string;
  id: string;
  spec: unknown;
  kind: "hardware" | "software" | "music" | "dance" | "print" | "recipe";
}

/** Look renders are slow (sketch + portrait, sequential), so they queue
 * up and run last: any bad spec or record fails the seed in seconds,
 * before a single render burns time or money. */
const pendingLooks: PendingLook[] = [];

async function renderPendingLooks(): Promise<void> {
  for (;;) {
    const p = pendingLooks.shift();
    if (!p) return;
    if (looksSkipped) continue;
    try {
      const { lookPath, blueprintPath } = await retryAsync(
        () =>
          renderLook(p.client, p.uid, {
            id: p.id,
            spec: p.spec,
            kind: p.kind,
          }),
        {
          label: `look ${(p.spec as { name?: string }).name ?? p.id}`,
          fatal: (e) => e instanceof MissingKeyError,
        },
      );
      const { error } = await p.client
        .from("apps")
        .update({ look_path: lookPath, blueprint_path: blueprintPath })
        .eq("id", p.id);
      if (error) throw new Error(`look paths: ${error.message}`);
      console.log(`look: ${(p.spec as { name?: string }).name ?? p.id}`);
    } catch (e) {
      if (e instanceof MissingKeyError) {
        looksSkipped = true;
        console.log("looks skipped (no model key)");
        continue;
      }
      throw e;
    }
  }
}

/** createApp plus a queued look render (see pendingLooks). Fails fast when
 * the spec doesn't parse. */
async function createSeedApp(
  client: Client,
  uid: string,
  spec: unknown,
  opts: {
    source: "build";
    summary: string;
    workshopId: string;
    kind?: "hardware" | "software" | "music" | "dance" | "print" | "recipe";
  },
): Promise<string> {
  const parsed = parseSpec(spec);
  if (!parsed.ok) {
    throw new Error(
      `seed spec ${(spec as { name?: string }).name}: ${parsed.issues.join("; ")}`,
    );
  }
  const id = await createApp(client, spec, opts);
  pendingLooks.push({ client, uid, id, spec, kind: opts.kind ?? "software" });
  return id;
}

type Accent = AppSpec["look"]["accent"];
type StatAgg = "count" | "sum" | "latest" | "avg";

/** One-collection tracker: a list + form screen and a numbers screen. */
function trackerSpec(o: {
  name: string;
  tagline: string;
  accent: Accent;
  icon: string;
  collection: string;
  collName: string;
  fields: Field[];
  show: string[];
  sortField: string;
  sortDir: "asc" | "desc";
  submit: string;
  statsTitle: string;
  stats: { title: string; field: string; agg: StatAgg }[];
}): AppSpec {
  const c = o.collection;
  const main: Block[] = [
    {
      id: `${c}_list`,
      title: `All ${o.collName.toLowerCase()}`,
      type: "list",
      collection: c,
      show: o.show,
      sort: { field: o.sortField, dir: o.sortDir },
    },
    {
      id: `${c}_form`,
      title: "Add one",
      type: "form",
      collection: c,
      fields: o.fields.map((f) => f.id),
      submitLabel: o.submit,
    },
  ];
  const numbers: Block[] = o.stats.map(
    (s, i): Block => ({
      id: `${c}_stat_${i}`,
      title: s.title,
      type: "stat",
      collection: c,
      field: s.field,
      agg: s.agg,
      chart: "none",
    }),
  );
  return {
    version: 1,
    name: o.name,
    tagline: o.tagline,
    look: { accent: o.accent, icon: o.icon },
    collections: [{ id: c, name: o.collName, fields: o.fields }],
    screens: [
      { id: "main", title: o.collName, icon: o.icon, blocks: main },
      { id: "numbers", title: o.statsTitle, icon: "📈", blocks: numbers },
    ],
  };
}

/** Print project: items to lay out plus a draw board for the artwork. */
function printSpec(o: {
  name: string;
  tagline: string;
  accent: Accent;
  icon: string;
  collection: string;
  collName: string;
  fields: Field[];
  show: string[];
  titleField: string;
  imageField: string;
  promptTemplate: string;
  drawTitle: string;
}): AppSpec {
  const c = o.collection;
  const main: Block[] = [
    {
      id: `${c}_form`,
      title: "Add one",
      type: "form",
      collection: c,
      fields: o.fields.map((f) => f.id).filter((id) => id !== o.imageField),
      submitLabel: "Add",
    },
    {
      id: `${c}_list`,
      title: `All ${o.collName.toLowerCase()}`,
      type: "list",
      collection: c,
      show: o.show,
    },
  ];
  const art: Block[] = [
    {
      id: `${c}_draw`,
      title: o.drawTitle,
      type: "draw",
      collection: c,
      titleField: o.titleField,
      imageField: o.imageField,
      promptTemplate: o.promptTemplate,
    },
  ];
  return {
    version: 1,
    name: o.name,
    tagline: o.tagline,
    look: { accent: o.accent, icon: o.icon },
    collections: [{ id: c, name: o.collName, fields: o.fields }],
    screens: [
      { id: "main", title: o.collName, icon: o.icon, blocks: main },
      { id: "art", title: o.drawTitle, icon: "🎨", blocks: art },
    ],
  };
}

/** Hardware parts list shared by the garage-style builds. */
function partsSpec(
  name: string,
  tagline: string,
  accent: Accent,
  icon: string,
): AppSpec {
  return trackerSpec({
    name,
    tagline,
    accent,
    icon,
    collection: "parts",
    collName: "Parts",
    fields: [
      { id: "part", name: "Part", type: "text" },
      { id: "qty", name: "Qty", type: "number" },
      { id: "cost", name: "Cost", type: "number" },
      {
        id: "status",
        name: "Status",
        type: "choice",
        options: ["needed", "ordered", "arrived"],
      },
    ],
    show: ["part", "qty", "status"],
    sortField: "part",
    sortDir: "asc",
    submit: "Add part",
    statsTitle: "Budget",
    stats: [
      { title: "Parts cost", field: "cost", agg: "sum" },
      { title: "Line items", field: "part", agg: "count" },
    ],
  });
}

async function addRecords(
  client: Client,
  appId: string,
  collection: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  for (const data of rows) await addRecord(client, appId, collection, data);
}

async function setStage(
  client: Client,
  appId: string,
  stage: string,
): Promise<void> {
  const { error } = await client.from("apps").update({ stage }).eq("id", appId);
  if (error) throw new Error(`stage ${appId}: ${error.message}`);
}

/** Polaroid spot on the workshop wall (0-100), arranged by hand once and
 * kept here so reseeds reproduce the layout. */
async function setPosition(
  client: Client,
  appId: string,
  x: number,
  y: number,
): Promise<void> {
  const { error } = await client
    .from("apps")
    .update({ room_x: x, room_y: y })
    .eq("id", appId);
  if (error) throw new Error(`position ${appId}: ${error.message}`);
}

async function seedMaria(client: Client, uid: string): Promise<string> {
  const cafeId = await makeWorkshop(client, "The Café", "cafe");
  const studioId = await makeWorkshop(client, "Dance Studio", "studio");
  const musicId = await makeWorkshop(client, "Music Room", "music");
  const appId = await createSeedApp(
    client,
    uid,
    { ...mariaFixture, name: "Bakery orders" },
    { source: "build", summary: "Demo seed", workshopId: cafeId },
  );
  const seedOpts = (workshopId: string, kind: "hardware" | "software" | "music" | "dance" | "print" | "recipe") => ({
    source: "build" as const,
    summary: "Demo seed",
    workshopId,
    kind,
  });
  const espressoId = await createSeedApp(
    client,
    uid,
    partsSpec(
      "Espresso machine v2",
      "Rebuilding the café's second espresso machine.",
      "ochre",
      "🔧",
    ),
    seedOpts(cafeId, "hardware"),
  );
  const registerId = await createSeedApp(
    client,
    uid,
    trackerSpec({
      name: "Register drawer fix",
      tagline: "Getting the old drawer to slide and ring again.",
      accent: "teal",
      icon: "🧰",
      collection: "fixes",
      collName: "Fixes",
      fields: [
        { id: "issue", name: "Issue", type: "text" },
        { id: "tried", name: "Tried", type: "text" },
        { id: "cost", name: "Cost", type: "number" },
        { id: "fixed", name: "Fixed", type: "bool" },
      ],
      show: ["issue", "fixed"],
      sortField: "issue",
      sortDir: "asc",
      submit: "Log fix",
      statsTitle: "Costs",
      stats: [{ title: "Fix costs", field: "cost", agg: "sum" }],
    }),
    seedOpts(cafeId, "hardware"),
  );
  const loyaltyId = await createSeedApp(
    client,
    uid,
    trackerSpec({
      name: "Loyalty app",
      tagline: "Regulars earn free coffee and pastry.",
      accent: "plum",
      icon: "☕",
      collection: "members",
      collName: "Members",
      fields: [
        { id: "name", name: "Name", type: "text" },
        { id: "visits", name: "Visits", type: "number" },
        {
          id: "reward",
          name: "Reward",
          type: "choice",
          options: ["none", "free coffee", "free pastry"],
        },
      ],
      show: ["name", "visits", "reward"],
      sortField: "name",
      sortDir: "asc",
      submit: "Add member",
      statsTitle: "Visits",
      stats: [
        { title: "Total visits", field: "visits", agg: "sum" },
        { title: "Members", field: "name", agg: "count" },
      ],
    }),
    seedOpts(cafeId, "software"),
  );
  const menuId = await createSeedApp(
    client,
    uid,
    printSpec({
      name: "Autumn menu board",
      tagline: "Fall flavors on the big chalkboard.",
      accent: "olive",
      icon: "🪧",
      collection: "items",
      collName: "Items",
      fields: [
        { id: "name", name: "Name", type: "text" },
        { id: "description", name: "Description", type: "text" },
        { id: "price", name: "Price", type: "number" },
        { id: "picture", name: "Picture", type: "photo" },
      ],
      show: ["name", "price"],
      titleField: "name",
      imageField: "picture",
      promptTemplate:
        "a chalkboard café menu illustration of {name}: {description}, autumn colors",
      drawTitle: "Board",
    }),
    seedOpts(cafeId, "print"),
  );
  const showcaseId = await createSeedApp(
    client,
    uid,
    trackerSpec({
      name: "Instagram Reel Dance",
      tagline: "Thirty seconds, one take, ready to post.",
      accent: "indigo",
      icon: "💃",
      collection: "rehearsals",
      collName: "Rehearsals",
      fields: [
        { id: "date", name: "Date", type: "date" },
        { id: "section", name: "Section", type: "text" },
        { id: "notes", name: "Notes", type: "text" },
        { id: "clean", name: "Clean", type: "bool" },
      ],
      show: ["date", "section", "clean"],
      sortField: "date",
      sortDir: "desc",
      submit: "Log rehearsal",
      statsTitle: "Sessions",
      stats: [{ title: "Sessions", field: "date", agg: "count" }],
    }),
    seedOpts(studioId, "dance"),
  );
  const sonataId = await createSeedApp(
    client,
    uid,
    trackerSpec({
      name: "New Sonata",
      tagline: "A new rendition of the Midnight Sonata.",
      accent: "terracotta",
      icon: "🎵",
      collection: "movements",
      collName: "Movements",
      fields: [
        { id: "name", name: "Name", type: "text" },
        { id: "tempo", name: "Tempo", type: "number" },
        { id: "notes", name: "Notes", type: "text" },
        { id: "polished", name: "Polished", type: "bool" },
      ],
      show: ["name", "tempo", "polished"],
      sortField: "name",
      sortDir: "asc",
      submit: "Add movement",
      statsTitle: "Progress",
      stats: [{ title: "Movements", field: "name", agg: "count" }],
    }),
    seedOpts(musicId, "music"),
  );
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
  await addRecords(client, espressoId, "parts", [
    { part: "Group head gasket", qty: 1, cost: 18, status: "arrived" },
    { part: "Portafilter basket", qty: 2, cost: 24, status: "ordered" },
    { part: "Steam wand tip", qty: 1, cost: 12, status: "needed" },
    { part: "Descaler", qty: 3, cost: 9, status: "arrived" },
  ]);
  await addRecords(client, registerId, "fixes", [
    { issue: "Drawer sticks", tried: "Cleaned the rails", cost: 6, fixed: false },
    { issue: "Bell too quiet", tried: "Tightened the hammer", cost: 0, fixed: true },
    { issue: "Receipts jam", tried: "Fitted a new roller", cost: 14, fixed: true },
  ]);
  await addRecords(client, loyaltyId, "members", [
    { name: "Ana", visits: 9, reward: "free coffee" },
    { name: "Ben", visits: 4, reward: "none" },
    { name: "Cara", visits: 12, reward: "free pastry" },
  ]);
  await addRecords(client, menuId, "items", [
    { name: "Maple oat latte", description: "Espresso, oat milk, maple", price: 5.25 },
    { name: "Harvest salad", description: "Apple, walnut, cider dressing", price: 9.5 },
    { name: "Cider donut", description: "Warm, cinnamon sugar", price: 3 },
  ]);
  await addRecords(client, showcaseId, "rehearsals", [
    { date: dayAgo(2), section: "Hook (first 3 seconds)", notes: "Land the turn on the beat", clean: false },
    { date: dayAgo(5), section: "Chorus drop", notes: "Spacing fixed", clean: true },
    { date: dayAgo(9), section: "End card", notes: "Needs one more run", clean: false },
  ]);
  await addRecords(client, sonataId, "movements", [
    { name: "First movement", tempo: 60, notes: "Slow and even", polished: true },
    { name: "Second movement", tempo: 90, notes: "Lighten the left hand", polished: false },
    { name: "Third movement", tempo: 160, notes: "Build speed gradually", polished: false },
  ]);
  await setStage(client, appId, "arrived");
  await setPosition(client, appId, 74.56, 2.54);
  await setStage(client, espressoId, "arrived");
  await setPosition(client, espressoId, 39.81, 39.43);
  await setStage(client, registerId, "arrived");
  await setPosition(client, registerId, 61.79, 39.12);
  await setStage(client, loyaltyId, "arrived");
  await setPosition(client, loyaltyId, 20.29, 39.1);
  await setStage(client, menuId, "arrived");
  await setPosition(client, menuId, 45.87, 1);
  await setStage(client, showcaseId, "arrived");
  await setPosition(client, showcaseId, 50.71, 9.67);
  await setStage(client, sonataId, "arrived");
  await setPosition(client, sonataId, 26.32, 31.54);
  await renderPendingLooks();
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
    const { x } = await retryAsync(() => scorePhoto(client, path, dims), {
      label: `score ${file}`,
      fatal: (e) => e instanceof MissingKeyError,
    });
    const row = await addExample(client, model.id, path, x, y);
    if (!row.x) throw new Error(`example ${file}: no features saved`);
    brain.train.push({ x: row.x, y });
    console.log(`${file}: y=${y} x=[${x.map((v) => v.toFixed(2)).join(",")}]`);
  }
  train(brain, 20);
  await saveModel(client, model.id, snapshot(brain));

  const trickPath = await upload(client, uid, appId, "loaf-trick.jpg");
  const trick = await retryAsync(() => scorePhoto(client, trickPath, dims), {
    label: "score loaf-trick.jpg",
    fatal: (e) => e instanceof MissingKeyError,
  });
  const verdict = answer(brain, trick.x);
  const conf = Math.round(verdict.conf * 100);
  console.log(`Trick loaf: ${verdict.label} at ${conf}%`);
  if (verdict.label !== "Sell" || conf < 85) {
    console.log("Pick a different trick photo");
    process.exit(1);
  }
}

async function seedCole(client: Client, uid: string): Promise<string> {
  const storeId = await makeWorkshop(client, "The Store", "store");
  const garageId = await makeWorkshop(client, "The Garage", "garage");
  const kitchenId = await makeWorkshop(client, "The Kitchen", "kitchen");
  const appId = await createSeedApp(
    client,
    uid,
    { ...coleFixture, name: "Restoration Bench" },
    {
      source: "build",
      summary: "Demo seed",
      workshopId: garageId,
      kind: "hardware",
    },
  );
  const seedOpts = (workshopId: string, kind: "hardware" | "software" | "music" | "dance" | "print" | "recipe") => ({
    source: "build" as const,
    summary: "Demo seed",
    workshopId,
    kind,
  });
  const rackId = await createSeedApp(
    client,
    uid,
    partsSpec(
      "Bike wall rack",
      "Bikes off the floor, onto the wall.",
      "indigo",
      "🚲",
    ),
    seedOpts(garageId, "hardware"),
  );
  const lampId = await createSeedApp(
    client,
    uid,
    partsSpec(
      "Workbench lamp",
      "A bright arm for the workbench.",
      "ochre",
      "🔦",
    ),
    seedOpts(garageId, "hardware"),
  );
  const neonId = await createSeedApp(
    client,
    uid,
    printSpec({
      name: "Neon Sign",
      tagline: "Cole's General Store in glowing glass tubes.",
      accent: "plum",
      icon: "💡",
      collection: "proofs",
      collName: "Proofs",
      fields: [
        { id: "version", name: "Version", type: "text" },
        { id: "notes", name: "Notes", type: "text" },
        { id: "price", name: "Price", type: "number" },
        { id: "picture", name: "Picture", type: "photo" },
      ],
      show: ["version", "price"],
      titleField: "version",
      imageField: "picture",
      promptTemplate:
        "a glowing neon sign mockup for a general store: {notes}, night, storefront window",
      drawTitle: "Sign",
    }),
    seedOpts(storeId, "print"),
  );
  const tipsId = await createSeedApp(
    client,
    uid,
    trackerSpec({
      name: "Quick Repair Tips",
      tagline: "Look up the fix before you call for help.",
      accent: "teal",
      icon: "🪛",
      collection: "tips",
      collName: "Tips",
      fields: [
        { id: "item", name: "Item", type: "text" },
        { id: "problem", name: "Problem", type: "text" },
        { id: "fix", name: "Fix", type: "text" },
        {
          id: "difficulty",
          name: "Difficulty",
          type: "choice",
          options: ["easy", "medium", "tricky"],
        },
      ],
      show: ["item", "problem", "difficulty"],
      sortField: "item",
      sortDir: "asc",
      submit: "Add tip",
      statsTitle: "Library",
      stats: [{ title: "Tips", field: "item", agg: "count" }],
    }),
    seedOpts(storeId, "software"),
  );
  const spaghettiId = await createSeedApp(
    client,
    uid,
    trackerSpec({
      name: "Grandma's Spaghetti",
      tagline: "Nonna's 1920s recipe, batch by batch.",
      accent: "terracotta",
      icon: "🍝",
      collection: "batches",
      collName: "Batches",
      fields: [
        { id: "cooked", name: "Cooked", type: "date" },
        { id: "tweaks", name: "Tweaks", type: "text" },
        { id: "servings", name: "Servings", type: "number" },
        { id: "cost", name: "Cost", type: "number" },
      ],
      show: ["cooked", "servings"],
      sortField: "cooked",
      sortDir: "desc",
      submit: "Log batch",
      statsTitle: "Cost",
      stats: [{ title: "Average cost", field: "cost", agg: "avg" }],
    }),
    seedOpts(kitchenId, "recipe"),
  );
  const stoolId = await createSeedApp(
    client,
    uid,
    partsSpec(
      "Movable Stool",
      "A wheeled stool that locks where you leave it.",
      "olive",
      "🪑",
    ),
    seedOpts(kitchenId, "hardware"),
  );
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
  await addRecords(client, rackId, "parts", [
    { part: "Steel arms", qty: 2, cost: 44, status: "arrived" },
    { part: "Wall anchors", qty: 8, cost: 12, status: "arrived" },
    { part: "Rubber cradles", qty: 2, cost: 18, status: "ordered" },
  ]);
  await addRecords(client, lampId, "parts", [
    { part: "Shade", qty: 1, cost: 22, status: "arrived" },
    { part: "LED panel", qty: 1, cost: 35, status: "ordered" },
    { part: "Gooseneck arm", qty: 1, cost: 19, status: "needed" },
  ]);
  await addRecords(client, neonId, "proofs", [
    { version: "v1 script", notes: "Cursive Cole's, warm white", price: 180 },
    { version: "v2 block", notes: "Block letters, amber glow", price: 220 },
  ]);
  await addRecords(client, tipsId, "tips", [
    { item: "Faucet", problem: "Drips all night", fix: "Replace the washer", difficulty: "easy" },
    { item: "Door", problem: "Squeaks", fix: "Oil the hinges", difficulty: "easy" },
    { item: "Dryer", problem: "No heat", fix: "Check the vent for lint", difficulty: "medium" },
  ]);
  await addRecords(client, spaghettiId, "batches", [
    { cooked: dayAgo(1), tweaks: "Extra garlic, less salt", servings: 6, cost: 14 },
    { cooked: dayAgo(8), tweaks: "San Marzano tomatoes", servings: 8, cost: 18 },
    { cooked: dayAgo(15), tweaks: "First try, followed the card", servings: 4, cost: 11 },
  ]);
  await addRecords(client, stoolId, "parts", [
    { part: "Caster wheels", qty: 4, cost: 32, status: "arrived" },
    { part: "Oak seat blank", qty: 1, cost: 28, status: "ordered" },
    { part: "Lock levers", qty: 4, cost: 16, status: "needed" },
  ]);
  await setStage(client, appId, "arrived");
  await setPosition(client, appId, 25.5, 33.46);
  await setStage(client, rackId, "arrived");
  await setPosition(client, rackId, 76.87, 4.28);
  await setStage(client, lampId, "arrived");
  await setPosition(client, lampId, 51.74, 34.87);
  await setStage(client, neonId, "arrived");
  await setPosition(client, neonId, 46.95, 6.19);
  await setStage(client, tipsId, "arrived");
  await setPosition(client, tipsId, 68.33, 29.67);
  await setStage(client, spaghettiId, "arrived");
  await setPosition(client, spaghettiId, 73.17, 9.73);
  await setStage(client, stoolId, "arrived");
  await setPosition(client, stoolId, 24.83, 34.01);
  await renderPendingLooks();
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

  for (const who of ["maria", "cole"] as const) {
    const { error } = await admin
      .from("demo_templates")
      .upsert({ owner: ids[who], label: who }, { onConflict: "owner" });
    if (error) throw new Error(`register template: ${error.message}`);
    console.log(`demo template: ${who}`);
  }

  console.log("---");
  console.log("maria@example.com / cole@example.com reseeded");
  console.log("projects=14 orders=8 pantry=2 specials=3 pieces=3 loaf examples=6");
  console.log(`TEMPLATE_MARIA_UID=${ids.maria}`);
  console.log(`TEMPLATE_COLE_UID=${ids.cole}`);
  console.log("SEED PASS");
}

void main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

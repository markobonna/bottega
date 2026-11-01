// Batch-convert bottega-images cartoon PNGs to realistic photos via /images/edits.
// Prompts transcribed from docs/design/bottega-images/PROMPTS.md (style block +
// layout lock + section prefix + per-file prompt). Resumable: skips outputs that exist.
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";

const SRC = "docs/design/bottega-images";
const OUT = `${SRC}/real`;
const FAIL_LOG = "/tmp/realify-failures.log";

const STYLE = "Photorealistic photograph. Warm natural afternoon light coming from the left. Soft, realistic shadows. Real materials: oak, brass, enamel, plaster, cork, steel. Color palette: sage green, brass, terracotta red, warm oak, cream. Calm and clean, slightly film-like color. No people, no readable text, no logos, no watermark.";
const LOCK = "Use the attached drawing as an exact layout reference. Keep the same camera angle, framing, positions, shapes and proportions. Only change the look from illustration to a real photograph.";

const SECTIONS = {
  rooms: {
    size: "1536x1024",
    prefix: "Interior photo taken straight on at eye level, one-point perspective. A window on the left wall, a wooden door on the right wall. The long counter across the front is completely empty. 16:9.",
    files: {
      "01-cafe": "A cozy specialty café. On the back wall, left to right: open wooden shelves with coffee bags, glass jars and cups; a dark green chalkboard in a wooden frame with a few faint chalk lines; a cork pinboard with pinned paper sketches. Three teal pendant lamps glowing warm. Exposed wooden ceiling beams, cream plaster walls above oak wainscoting. A long oak café counter with two wooden stools. Warm terracotta tile floor.",
      "02-garage": "A tidy home garage workshop. On the back wall: a pegboard with hand tools on the left, a closed metal roll-up garage door in the center, metal shelving with colorful plastic storage bins on the right. Bare bulb pendant lights. Concrete walls and floor. A long wooden workbench with two stools.",
      "03-studio": "A bright dance studio. The whole back wall is three large mirror panels with a wooden ballet barre in front. Black track spotlights on a ceiling rail. Honey-colored wooden plank floor, completely empty. No counter.",
      "04-store": "A small independent shop. Tall shelves packed with colorful goods on both sides of the back wall. A framed blank sign in the center. Teal pendant lamps. A long sage-green shop counter with two stools.",
      "05-kitchen": "A small restaurant kitchen. A rail of hanging copper and steel pots on the left. White square-tiled back wall. A stainless steel range hood in the center. A cork order board on the right. A long stainless steel prep counter with two stools.",
      "06-music": "A home music room. Blue and brown acoustic foam panels on the left of the back wall. A framed vinyl record in the center. Three acoustic guitars (red, amber, teal) hanging on the right. Warm wood floor. A long dark walnut desk with two stools.",
      "07-classroom": "A warm classroom. A bookshelf full of colorful books on the left. A green chalkboard in the center with a simple chalk triangle and equation. A cork board on the right. A long wooden teacher's desk with two stools.",
      "08-other": "A general maker's workshop. Open shelves with jars, boxes and plants on both sides of the back wall. A large cork pinboard in the center. Teal pendant lamps. A long wooden workbench with two stools.",
    },
  },
  buildings: {
    size: "1024x1024",
    prefix: "A realistic architectural miniature (diorama) of a single small building, photographed from above at a 30° isometric angle so two walls and the flat roof show. It stands on a small square of ground with a soft shadow. Plain white background.",
    files: {
      "00-island-empty": "A square island of packed earth with a thick soil edge, crossed by two pairs of light gravel paths. A small round stone fountain in the center. Eight small round trees near the edges. One lot at the front marked with four wooden stakes and red flags. Seen from above at 30°, on a cream paper background.",
      "01-cafe": "A café: cream plaster walls, sage-green flat roof, a red-and-white striped awning over a big front window, a wooden door, a small ceramic coffee-cup sign on the roof, warm light glowing in the windows.",
      "02-garage": "A garage: ochre stucco walls, brown flat roof, a roll-up garage door half lit with warm light from inside, one small window, a red brick chimney with a thin wisp of smoke.",
      "03-studio": "A dance studio: pale pink-beige walls, mauve flat roof, tall glass windows with two dancers' silhouettes inside, a wooden door, a small blank sign.",
      "04-store": "A shop: beige walls, slate-blue roof, a big display window, a green-and-white striped awning, a blank sign band above.",
      "05-kitchen": "A small restaurant: cream walls, terracotta roof, two windows, a wooden side door, a red brick chimney with steam.",
      "06-music": "A music room: cream walls, slate-blue roof, a large window and a door, a small metal music-note sculpture on the roof.",
      "07-classroom": "A schoolhouse: pale yellow walls, brown roof, a row of three windows, a door, a small red flag on a pole on the roof.",
      "08-other": "A simple workshop: cream walls, dark brown roof, one window, a wooden door.",
    },
  },
  objects: {
    size: "1024x1024",
    prefix: "Product photograph of a single object, seen from the front and slightly above, centered, on a plain white background with a soft contact shadow.",
    files: {
      "01-espresso": "A two-group espresso machine: sage-green enamel body, brass top rail and brass group heads, two round pressure gauges, black portafilter handles, a steel steam wand on the left, a stainless drip tray.",
      "02-register": "A vintage-modern cash register: sage-green metal body, cream keypad, a small black display with amber digits on a post, a cash drawer at the bottom with a brass handle.",
      "03-device": "A compact countertop appliance: boxy brick-red metal body, brass top, a small black display, two round knobs, horizontal vent slots, short black feet.",
      "04-lamp": "An articulated clamp-on workbench lamp: black steel arms, a brass joint, a red metal cone shade, a glowing warm bulb, a heavy black base.",
      "05-rack": "A wall-mounted oak bike rack with three black steel hooks, three bicycle wheels hanging from it.",
      "06-software": "A tablet on a small black stand. The screen shows a simple app: a green header bar, two cream cards and a red button.",
      "07-music": "A black metal music stand holding a sheet of printed music.",
      "08-dance": "An open notebook lying on a counter, showing a hand-drawn diagram of numbered footprints in red chalk.",
      "09-print": "An A-frame wooden sidewalk chalkboard sign with four lines of chalk writing (not readable).",
      "10-recipe": "A terracotta-red enamel cooking pot with a steel lid and rising steam, two small spice jars (amber and sage) beside it.",
      "11-space": "An architectural floor plan sheet unrolled flat on a table, with a rolled-up plan tube beside it.",
      "12-dance-floor-marks": "Eight pairs of red chalk footprints marked on a honey wood floor, connected by a faint dashed chalk path, seen from slightly above.",
      "13-crate-on-its-way": "A wooden shipping crate with diagonal cross braces and a cream paper shipping label (blank).",
    },
  },
  workbench: {
    size: "1600x1200",
    prefix: "Clean studio photograph, straight front view, object centered and filling about 60% of the frame, on a seamless warm cream paper backdrop, soft even light. Leave out all measurement lines, arrows and handwritten notes. 4:3.",
    files: {
      "01-espresso": "The sage-green two-group espresso machine with brass details, two gauges, black portafilters and a steel drip tray.",
      "02-register": "The sage-green cash register with cream keypad, amber-digit display and drawer.",
      "03-device": "The brick-red countertop appliance with brass top, black display and two knobs.",
      "04-lamp": "The articulated clamp-on lamp with black arms, brass joint and red shade, light on, side view.",
      "05-rack": "The oak wall rack with three black hooks and three bicycle wheels hanging from it, on a cream wall.",
      "06-software": "A phone and a desktop monitor side by side on a desk, showing the same app: a keypad with a big red button on the phone, a dashboard with a bar chart on the monitor.",
      "07-music": "Top-down photo of a printed lead sheet on a walnut desk, two lines of music, a pencil beside it.",
      "08-dance": "Top-down photo of a wooden stage floor with colored tape dots marking dancers' start positions (red) and end positions (green), connected by chalk paths.",
      "09-print": "A dark green chalkboard menu in a wooden frame, photographed straight on, with a chalk heading and three menu lines (not readable).",
      "10-recipe": "Overhead food photo: a terracotta pot of spiced chai beside a handwritten recipe card on a linen cloth.",
      "11-space": "Top-down photo of a white architectural scale model of a café: an L-shaped oak counter, five round sage-green tables with chairs, and a door.",
    },
  },
};

const base = process.env.MODEL_API_BASE_URL ?? "https://api.meta.ai/v1";
const key = process.env.MODEL_API_KEY ?? "";
const model = process.env.IMAGE_MODEL ?? "muse-image-1.0";
if (!key) { console.error("MODEL_API_KEY missing"); process.exit(1); }

// Per-folder size, downgraded to square if the endpoint rejects it.
const folderSize = {};
for (const [folder, sec] of Object.entries(SECTIONS)) folderSize[folder] = sec.size;

async function convert(folder, name, prompt, imgBytes) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const size = folderSize[folder];
    const form = new FormData();
    form.set("model", model);
    form.set("prompt", `${STYLE} ${LOCK} ${prompt}`);
    form.set("size", size);
    form.set("n", "1");
    form.set("image", new Blob([imgBytes], { type: "image/png" }), `${name}.png`);
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 180000);
    try {
      const res = await fetch(`${base}/images/edits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: ctl.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        if (size !== "1024x1024") { folderSize[folder] = "1024x1024"; continue; } // downgrade + retry
        return { ok: false, err: `status ${res.status}: ${text.slice(0, 200)}` };
      }
      const b64 = JSON.parse(text)?.data?.[0]?.b64_json;
      if (!b64) return { ok: false, err: `no b64_json: ${text.slice(0, 200)}` };
      return { ok: true, bytes: Buffer.from(b64, "base64"), size };
    } catch (e) {
      return { ok: false, err: String(e).slice(0, 200) };
    } finally {
      clearTimeout(t);
    }
  }
  return { ok: false, err: "retry exhausted" };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let done = 0, skipped = 0, failed = 0;
const total = Object.values(SECTIONS).reduce((n, s) => n + Object.keys(s.files).length, 0);

for (const [folder, sec] of Object.entries(SECTIONS)) {
  mkdirSync(`${OUT}/${folder}`, { recursive: true });
  for (const [name, filePrompt] of Object.entries(sec.files)) {
    const out = `${OUT}/${folder}/${name}-real.png`;
    if (existsSync(out)) { skipped++; continue; }
    const imgBytes = readFileSync(`${SRC}/${folder}/${name}.png`);
    const prompt = `${sec.prefix} ${filePrompt}`;
    const r = await convert(folder, name, prompt, imgBytes);
    if (r.ok) { writeFileSync(out, r.bytes); done++; console.log(`ok ${folder}/${name} @${r.size} (${done + skipped}/${total})`); }
    else { failed++; appendFileSync(FAIL_LOG, `${folder}/${name}: ${r.err}\n`); console.log(`FAIL ${folder}/${name}: ${r.err}`); }
    await sleep(1500);
  }
}
console.log(`REALIFY DONE done=${done} skipped=${skipped} failed=${failed} total=${total}`);
process.exit(failed ? 1 : 0);

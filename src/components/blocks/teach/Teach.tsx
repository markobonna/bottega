"use client";

import { useEffect, useRef, useState } from "react";
import { logEvent, signPhotoPaths } from "@/app/projects/[id]/actions";
import {
  addExampleAction,
  getOrCreateModelAction,
  removeExampleAction,
  resetModelAction,
  saveModelAction,
  setFeaturesAction,
  setLabelAction,
} from "@/app/projects/[id]/teach-actions";
import { btn, Confirm, DataNotice, Label, Status } from "@/components/ui";
import {
  answer,
  createBrain,
  mistakes,
  pct,
  restore,
  snapshot,
  train,
  trainRound,
  wrongness,
  type Brain,
} from "@/lib/brain";
import { COLOR_DIM_NAMES, colorFeatures } from "@/lib/color";
import { resizeToJpeg, uploadPhoto } from "@/lib/media";
import type { DbExample, FeatureSource } from "@/lib/teach";
import type { BlockProps } from "../../runtime/registry";
import Curve from "./Curve";
import Dials, { type DialDim } from "./Dials";

const SURE = 0.56;
const PRACTICE_ROUNDS = 20;
const PRACTICE_MS = 90;

const COLOR_DIMS: DialDim[] = [
  { name: "Red", hint: "how much red is in the photo" },
  { name: "Yellow", hint: "how much yellow is in the photo" },
  { name: "Green", hint: "how much green is in the photo" },
  { name: "Blue", hint: "how much blue is in the photo" },
];

type Trainable = DbExample & { x: number[]; y: 0 | 1 };

type CheckedPhoto = { path: string; x: number[]; preview: string };

type SparkFeat = { status: "ok"; x: number[] } | { status: "nokey" };

function Balance({ p }: { p: number }) {
  const deg = ((p - 0.5) * 0.7 * 180) / Math.PI;
  const ink = "var(--ink)";
  return (
    <svg width={64} height={40} viewBox="0 0 64 40" aria-hidden="true">
      <line x1={32} y1={8} x2={32} y2={34} stroke={ink} strokeWidth={2} />
      <line x1={22} y1={34} x2={42} y2={34} stroke={ink} strokeWidth={2} />
      <g transform={`rotate(${deg} 32 12)`}>
        <line x1={10} y1={12} x2={54} y2={12} stroke={ink} strokeWidth={2} />
        <line x1={10} y1={12} x2={10} y2={20} stroke={ink} strokeWidth={2} />
        <line x1={54} y1={12} x2={54} y2={20} stroke={ink} strokeWidth={2} />
        <line x1={5} y1={20} x2={15} y2={20} stroke={ink} strokeWidth={2} />
        <line x1={49} y1={20} x2={59} y2={20} stroke={ink} strokeWidth={2} />
      </g>
    </svg>
  );
}

export default function Teach({ block, ctx }: BlockProps) {
  const addRef = useRef<HTMLInputElement>(null);
  const checkRef = useRef<HTMLInputElement>(null);
  const brainRef = useRef<Brain | null>(null);
  const previews = useRef<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const practiceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, setTick] = useState(0);
  const [modelId, setModelId] = useState<string | null>(null);
  const [source, setSource] = useState<FeatureSource>("spark");
  const [examples, setExamples] = useState<DbExample[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [practicing, setPracticing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<{
    path: string;
    preview: string;
    x: number[];
    source: FeatureSource;
  } | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [checked, setChecked] = useState<CheckedPhoto[]>([]);
  const [selected, setSelected] = useState<CheckedPhoto | null>(null);
  const [correction, setCorrection] = useState("");
  const [rereading, setRereading] = useState(false);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const held = previews.current;
    return () => {
      for (const u of held) URL.revokeObjectURL(u);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (practiceTimer.current) clearInterval(practiceTimer.current);
    };
  }, []);

  useEffect(() => {
    if (block.type !== "teach") return;
    let live = true;
    const teachBlock = block;
    (async () => {
      const names = teachBlock.dims.map((d) => d.name);
      const result = await getOrCreateModelAction(
        ctx.appId,
        teachBlock.id,
        teachBlock.labels,
        names,
        "spark",
      );
      if (!live) return;
      if (!result.ok) {
        setProblem(result.error);
        setLoading(false);
        return;
      }
      const src: FeatureSource =
        result.model.feature_source === "color" ? "color" : "spark";
      const dimNames = src === "spark" ? names : COLOR_DIM_NAMES;
      const m = result.model;
      const br =
        m.w !== null &&
        m.b !== null &&
        m.rounds !== null &&
        m.curve !== null &&
        m.w.length === dimNames.length
          ? restore(
              {
                labels: teachBlock.labels,
                dims: dimNames,
                w: m.w,
                b: m.b,
                rounds: m.rounds,
                curve: m.curve,
              },
              [],
            )
          : createBrain(teachBlock.labels, dimNames);
      brainRef.current = br;
      br.train = trainableOf(result.examples, br.w.length);
      setModelId(m.id);
      setSource(src);
      setExamples(result.examples);
      setLoading(false);
      setTick((t) => t + 1);
    })().catch((e: unknown) => {
      if (live) {
        setProblem(e instanceof Error ? e.message : "Couldn't load the model.");
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [ctx.appId, block]);

  useEffect(() => {
    let live = true;
    const paths = [
      ...new Set(
        examples
          .map((e) => e.photo_path)
          .filter((p): p is string => typeof p === "string"),
      ),
    ];
    const missing = paths.filter((p) => !(p in urls));
    if (missing.length === 0) return;
    signPhotoPaths(missing).then((r) => {
      if (live && r.ok) setUrls((u) => ({ ...u, ...r.urls }));
    });
    return () => {
      live = false;
    };
  });

  if (block.type !== "teach") return null;
  const labels = block.labels;
  const sparkDimNames = block.dims.map((d) => d.name);
  const dims: DialDim[] = source === "spark" ? block.dims : COLOR_DIMS;
  const dimNames = source === "spark" ? sparkDimNames : COLOR_DIM_NAMES;
  const brain = brainRef.current;
  const locked = practicing || rereading || loading;

  function trainableOf(rows: DbExample[], n: number): Trainable[] {
    return rows.filter(
      (e): e is Trainable =>
        e.x !== null &&
        e.x.length === n &&
        (e.y === 0 || e.y === 1),
    );
  }

  function syncTrain(rows: DbExample[]) {
    const br = brainRef.current;
    if (!br) return;
    br.train = trainableOf(rows, br.w.length);
    setTick((t) => t + 1);
  }

  async function trySpark(photoPath: string): Promise<SparkFeat> {
    let res: Response;
    try {
      res = await fetch("/api/teach/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: ctx.appId,
          blockId: block.id,
          photoPath,
        }),
      });
    } catch {
      throw new Error("The model didn't answer. Try again.");
    }
    if (res.status === 503) return { status: "nokey" };
    if (!res.ok) throw new Error("The model didn't answer. Try again.");
    const data = (await res.json()) as { x: number[] };
    return { status: "ok", x: data.x };
  }

  async function pickAdd(file: File | undefined) {
    if (!file || !modelId || !brain) return;
    setAdding(true);
    setProblem("");
    setNotice("");
    try {
      const preview = URL.createObjectURL(file);
      previews.current.push(preview);
      const small = await resizeToJpeg(file);
      const path = await uploadPhoto(ctx.appId, small);
      if (examples.length > 0 && source === "spark") {
        const feat = await trySpark(path);
        if (feat.status === "nokey") {
          setProblem(
            "The model key is off, and this model was built with Muse Spark features. Add the key to teach it more.",
          );
          return;
        }
        setPending({ path, preview, x: feat.x, source: "spark" });
      } else if (examples.length > 0) {
        setPending({ path, preview, x: [...(await colorFeatures(small))], source: "color" });
      } else {
        const feat = await trySpark(path);
        if (feat.status === "ok") {
          setPending({ path, preview, x: feat.x, source: "spark" });
        } else {
          setPending({
            path,
            preview,
            x: [...(await colorFeatures(small))],
            source: "color",
          });
        }
      }
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Photo failed.");
    } finally {
      setAdding(false);
    }
  }

  async function labelPending(y: 0 | 1) {
    if (!pending || !modelId || !brain) return;
    if (pending.x.length !== brain.w.length) {
      setProblem("Project changed elsewhere; reload and try again.");
      setPending(null);
      return;
    }
    if (examples.length === 0 && pending.source !== source) {
      const names = dimNamesFor(pending.source);
      const flipped = await resetModelAction(modelId, pending.source, names);
      if (!flipped.ok) {
        setProblem(flipped.error);
        return;
      }
      brainRef.current = createBrain(labels, names);
      setSource(pending.source);
    }
    const added = await addExampleAction(modelId, pending.path, [...pending.x], y);
    if (!added.ok) {
      setProblem(added.error);
      return;
    }
    const next = [...examples, added.example];
    setExamples(next);
    syncTrain(next);
    setPending(null);
    setNotice("");
  }

  function dimNamesFor(src: FeatureSource): string[] {
    return src === "spark" ? sparkDimNames : COLOR_DIM_NAMES;
  }

  async function switchLabel(e: DbExample) {
    if (!modelId || e.y === null) return;
    const y = (e.y === 1 ? 0 : 1) as 0 | 1;
    const r = await setLabelAction(e.id, y);
    if (!r.ok) {
      setProblem(r.error);
      return;
    }
    const next = examples.map((x) => (x.id === e.id ? { ...x, y } : x));
    setExamples(next);
    syncTrain(next);
    setMenuFor(null);
  }

  async function removeOne(e: DbExample) {
    const r = await removeExampleAction(e.id);
    if (!r.ok) {
      setProblem(r.error);
      return;
    }
    const next = examples.filter((x) => x.id !== e.id);
    setExamples(next);
    syncTrain(next);
    setMenuFor(null);
  }

  function practice() {
    const br = brainRef.current;
    if (!br || practicing || !modelId) return;
    const counts = [0, 0];
    for (const e of br.train) counts[e.y]++;
    if (counts[0] < 2 || counts[1] < 2) return;
    setPracticing(true);
    setProblem("");
    setCorrection("");
    const finish = async () => {
      const r = await saveModelAction(modelId, snapshot(br));
      if (!r.ok) setProblem(r.error);
      else void logEvent(ctx.appId, "teach_trained", { n: br.train.length });
      setPracticing(false);
      setTick((t) => t + 1);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      train(br, PRACTICE_ROUNDS);
      setTick((t) => t + 1);
      void finish();
      return;
    }
    let i = 0;
    practiceTimer.current = setInterval(() => {
      trainRound(br);
      setTick((t) => t + 1);
      i++;
      if (i >= PRACTICE_ROUNDS) {
        if (practiceTimer.current) clearInterval(practiceTimer.current);
        practiceTimer.current = null;
        void finish();
      }
    }, PRACTICE_MS);
  }

  function dial(k: number, v: number) {
    const br = brainRef.current;
    if (!br) return;
    br.w[k] = v;
    setTick((t) => t + 1);
  }

  function bias(v: number) {
    const br = brainRef.current;
    if (!br) return;
    br.b = v;
    setTick((t) => t + 1);
  }

  function dialRelease() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const br = brainRef.current;
      if (!br || !modelId) return;
      void saveModelAction(modelId, snapshot(br)).then((r) => {
        if (!r.ok) setProblem(r.error);
      });
    }, 600);
  }

  async function pickCheck(file: File | undefined) {
    if (!file || !brain) return;
    setChecking(true);
    setProblem("");
    setCorrection("");
    try {
      const preview = URL.createObjectURL(file);
      previews.current.push(preview);
      const small = await resizeToJpeg(file);
      const path = await uploadPhoto(ctx.appId, small);
      let x: number[];
      if (source === "spark") {
        const feat = await trySpark(path);
        if (feat.status === "nokey") {
          setProblem("Checking is off right now (no model key).");
          return;
        }
        x = feat.x;
      } else {
        x = [...(await colorFeatures(small))];
      }
      if (x.length !== brain.w.length) {
        setProblem("Project changed elsewhere; reload and try again.");
        return;
      }
      const entry = { path, x, preview };
      setChecked((prev) => [entry, ...prev].slice(0, 6));
      setSelected(entry);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Photo failed.");
    } finally {
      setChecking(false);
    }
  }

  async function correct() {
    const br = brainRef.current;
    if (!selected || !modelId || !br) return;
    if (selected.x.length !== br.w.length) return;
    const before = answer(br, selected.x);
    const other = (before.side === 1 ? 0 : 1) as 0 | 1;
    setCorrecting(true);
    setProblem("");
    try {
      const added = await addExampleAction(modelId, selected.path, [...selected.x], other);
      if (!added.ok) {
        setProblem(added.error);
        return;
      }
      const next = [...examples, added.example];
      setExamples(next);
      syncTrain(next);
      train(br, PRACTICE_ROUNDS);
      const after = answer(br, selected.x);
      const saved = await saveModelAction(modelId, snapshot(br));
      if (!saved.ok) setProblem(saved.error);
      else
        void logEvent(ctx.appId, "teach_corrected", {
          from: before.label,
          to: labels[other],
        });
      setCorrection(
        `Was ${pct(before.conf)} ${before.label}. Now ${pct(after.conf)} ${after.label}.`,
      );
      setTick((t) => t + 1);
    } finally {
      setCorrecting(false);
    }
  }

  async function reread() {
    if (!modelId || rereading) return;
    const withPhotos = examples.filter(
      (e): e is DbExample & { photo_path: string } =>
        typeof e.photo_path === "string",
    );
    if (withPhotos.length === 0) return;
    setRereading(true);
    setProblem("");
    setNotice("");
    setCorrection("");
    try {
      const first = await trySpark(withPhotos[0].photo_path);
      if (first.status === "nokey") {
        setNotice("Still no model key — keeping colors.");
        return;
      }
      const scored = new Map<string, number[]>([[withPhotos[0].id, first.x]]);
      for (const e of withPhotos.slice(1)) {
        const feat = await trySpark(e.photo_path);
        if (feat.status === "nokey") {
          setProblem("The key went away mid-read. Nothing changed.");
          return;
        }
        scored.set(e.id, feat.x);
      }
      const names = sparkDimNames;
      const flipped = await resetModelAction(modelId, "spark", names);
      if (!flipped.ok) {
        setProblem(flipped.error);
        return;
      }
      for (const [id, x] of scored) {
        const r = await setFeaturesAction(id, x);
        if (!r.ok) {
          setProblem(r.error);
          return;
        }
      }
      const next = examples.map((e) => {
        const x = scored.get(e.id);
        return x ? { ...e, x } : e;
      });
      brainRef.current = createBrain(labels, names);
      setExamples(next);
      syncTrain(next);
      setSource("spark");
      setSelected(null);
      const saved = await saveModelAction(modelId, snapshot(brainRef.current));
      if (!saved.ok) setProblem(saved.error);
      const skipped = examples.length - withPhotos.length;
      setNotice(
        `Re-read ${scored.size} photo${scored.size === 1 ? "" : "s"} with Muse Spark. Practice again to train.${skipped > 0 ? ` (${skipped} without photos skipped.)` : ""}`,
      );
    } finally {
      setRereading(false);
    }
  }

  function guessMark(e: DbExample): { text: string; tone: "ok" | "bad" | "muted" } | null {
    const br = brainRef.current;
    if (!br || br.rounds === 0 || e.x === null || e.x.length !== br.w.length) return null;
    const a = answer(br, e.x);
    if (a.conf < SURE) return { text: `? ${pct(a.conf)}`, tone: "muted" };
    return a.side === e.y
      ? { text: `✓ ${pct(a.conf)}`, tone: "ok" }
      : { text: `✗ ${pct(a.conf)}`, tone: "bad" };
  }

  if (loading || !brain) {
    return <Status tone="muted">Loading your model…</Status>;
  }

  const counts = [0, 0];
  for (const e of brain.train) counts[e.y]++;
  const canPractice = counts[0] >= 2 && counts[1] >= 2;
  const verdict =
    selected !== null && selected.x.length === brain.w.length
      ? answer(brain, selected.x)
      : null;
  const menuExample = menuFor !== null ? examples.find((e) => e.id === menuFor) ?? null : null;

  return (
    <div className="flex flex-col gap-5">
      <p className="font-display text-xl">{block.question}</p>

      <section aria-label="Your examples" className="flex flex-col items-start gap-2">
        <Label>Your examples</Label>
        <input
          ref={addRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-label="Add an example photo"
          onChange={(e) => {
            void pickAdd(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {examples.length === 0 && pending === null ? (
          <p className="text-muted">Nothing here yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {examples.map((e) => {
              const mark = guessMark(e);
              const side = e.y === 1 ? 1 : 0;
              return (
                <div key={e.id} className="w-[72px] text-center">
                  <button
                    type="button"
                    disabled={locked}
                    aria-expanded={menuFor === e.id}
                    aria-label={`Example labelled ${labels[side]}${mark ? `, model guesses ${mark.text}` : ""}`}
                    onClick={() => setMenuFor((m) => (m === e.id ? null : e.id))}
                    className="block w-[72px] cursor-pointer rounded-[12px] border-[3px] disabled:cursor-not-allowed"
                    style={{
                      borderColor: side === 0 ? "var(--side-a)" : "var(--side-b)",
                    }}
                  >
                    {e.photo_path !== null && urls[e.photo_path] ? (
                      <img
                        src={urls[e.photo_path]}
                        alt=""
                        className="h-[66px] w-[66px] rounded-[9px] object-cover"
                      />
                    ) : (
                      <span aria-hidden="true" className="checker block h-[66px] w-[66px] rounded-[9px]" />
                    )}
                  </button>
                  <p className="mt-1 text-xs">{labels[side]}</p>
                  {mark !== null && (
                    <p
                      className={
                        mark.tone === "ok"
                          ? "text-xs text-ok"
                          : mark.tone === "bad"
                            ? "text-xs text-bad"
                            : "text-xs text-muted"
                      }
                    >
                      {mark.text}
                    </p>
                  )}
                  {e.x === null && (
                    <p className="text-xs text-muted">needs a re-read</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {pending !== null && (
          <div className="flex w-full flex-col items-start gap-2">
            <img src={pending.preview} alt="" className="w-full rounded-[12px]" />
            <p>This one is…</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={locked}
                onClick={() => void labelPending(0)}
                className={btn.primary}
              >
                {labels[0]}
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => void labelPending(1)}
                className={btn.primary}
              >
                {labels[1]}
              </button>
              <button
                type="button"
                onClick={() => setPending(null)}
                className={`${btn.quiet} ${btn.small}`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {menuExample !== null && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={locked}
              onClick={() => void switchLabel(menuExample)}
              className={`${btn.quiet} ${btn.small}`}
            >
              Label as {labels[menuExample.y === 1 ? 0 : 1]}
            </button>
            <Confirm label="Remove" onConfirm={() => void removeOne(menuExample)} />
            <button
              type="button"
              onClick={() => setMenuFor(null)}
              className={`${btn.quiet} ${btn.small}`}
            >
              Close
            </button>
          </div>
        )}
        <button
          type="button"
          disabled={locked || adding || pending !== null}
          onClick={() => addRef.current?.click()}
          className={btn.quiet}
        >
          {adding ? "Reading…" : "Add an example"}
        </button>
        <DataNotice />
        {source === "color" && (
          <div className="flex flex-col items-start gap-2">
            <Status tone="muted">
              Using colors only (no model key). Add a key and re-read photos
              with Muse Spark for sharper features.
            </Status>
            <button
              type="button"
              disabled={locked}
              onClick={() => void reread()}
              className={`${btn.quiet} ${btn.small}`}
            >
              {rereading ? "Re-reading…" : "Re-read all photos"}
            </button>
          </div>
        )}
      </section>

      <section aria-label="Practice" className="flex flex-col items-start gap-2">
        <Label>Practice</Label>
        {!canPractice && (
          <Status tone="muted">Add at least 2 of each.</Status>
        )}
        <button
          type="button"
          disabled={locked || !canPractice}
          onClick={practice}
          className={btn.primary}
        >
          {practicing ? "Practicing…" : "Practice 20 rounds"}
        </button>
        <p className="text-sm">
          {brain.rounds} rounds · {mistakes(brain)} of {brain.train.length} wrong ·{" "}
          {pct(wrongness(brain))} wrong
        </p>
        {brain.curve.length > 0 ? (
          <Curve curve={brain.curve} />
        ) : (
          <Status tone="muted">Not practiced yet.</Status>
        )}
      </section>

      <section aria-label="Its dials" className="flex flex-col gap-2">
        <Label>Its dials</Label>
        <Dials
          dims={dims}
          brain={brain}
          selectedX={selected?.x ?? null}
          disabled={locked}
          onDial={dial}
          onBias={bias}
          onRelease={dialRelease}
        />
      </section>

      <section aria-label="Check a new photo" className="flex flex-col items-start gap-2">
        <Label>Check a new photo</Label>
        <input
          ref={checkRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-label="Check a new photo"
          onChange={(e) => {
            void pickCheck(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={locked || checking}
          onClick={() => checkRef.current?.click()}
          className={btn.quiet}
        >
          {checking ? "Checking…" : "Take or choose a photo"}
        </button>
        <DataNotice />
        {checked.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {checked.map((c) => (
              <button
                key={c.path}
                type="button"
                aria-pressed={selected?.path === c.path}
                onClick={() => {
                  setSelected(c);
                  setCorrection("");
                }}
                className="cursor-pointer rounded-[12px]"
              >
                <img
                  src={c.preview}
                  alt=""
                  className="h-14 w-14 rounded-[12px] object-cover"
                />
              </button>
            ))}
          </div>
        )}
        {selected !== null && verdict !== null && (
          <div className="flex w-full flex-col items-start gap-2">
            <img src={selected.preview} alt="" className="w-full rounded-[12px]" />
            {verdict.conf >= SURE ? (
              <p
                className="font-display text-xl"
                style={{
                  color: verdict.side === 0 ? "var(--side-a)" : "var(--side-b)",
                }}
              >
                {verdict.label} · {pct(verdict.conf)} sure
              </p>
            ) : (
              <p className="font-display text-xl text-muted">
                Can&apos;t decide · {pct(verdict.p)} {labels[1]}
              </p>
            )}
            <Balance p={verdict.p} />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={locked || correcting}
                onClick={() => setNotice("Good.")}
                className={btn.quiet}
              >
                Right
              </button>
              <button
                type="button"
                disabled={locked || correcting}
                onClick={() => void correct()}
                className={btn.quiet}
              >
                {correcting ? "Learning…" : "It's wrong"}
              </button>
            </div>
            {correction !== "" && <p>{correction}</p>}
          </div>
        )}
      </section>

      {problem !== "" && <Status tone="bad">{problem}</Status>}
      {notice !== "" && <Status tone="ok">{notice}</Status>}
    </div>
  );
}

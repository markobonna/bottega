"use client";

import { useEffect, useRef, useState } from "react";
import { createRecord } from "@/app/apps/[id]/actions";
import { btn, DataNotice, Status } from "@/components/ui";
import { resizeToJpeg, uploadPhoto } from "@/lib/media";
import type { BlockProps } from "../runtime/registry";

interface SeeObject {
  box: [number, number, number, number];
  path: string;
  c: number;
}

interface SeeNoun {
  noun: string;
  count: number;
  objects: SeeObject[];
}

type Phase = "empty" | "reading" | "done" | "off" | "failed";

export default function See({ block, ctx }: BlockProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("empty");
  const [preview, setPreview] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [nouns, setNouns] = useState<SeeNoun[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [hidden, setHidden] = useState<string[]>([]);
  const [problem, setProblem] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (block.type !== "see") return null;
  const seeNouns = block.nouns;
  const saveTo = block.saveTo;

  async function runSee(path: string) {
    setPhase("reading");
    setProblem("");
    setSaved(false);
    let res: Response;
    try {
      res = await fetch("/api/see", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: ctx.appId, photoPath: path, nouns: seeNouns }),
      });
    } catch {
      setPhase("failed");
      return;
    }
    if (res.ok) {
      const data = (await res.json()) as {
        w: number;
        h: number;
        nouns: SeeNoun[];
      };
      setDims({ w: data.w, h: data.h });
      setNouns(data.nouns);
      setCounts(Object.fromEntries(data.nouns.map((n) => [n.noun, n.count])));
      setHidden([]);
      setPhase("done");
    } else if (res.status === 503) {
      setCounts(Object.fromEntries(seeNouns.map((n) => [n, 0])));
      setPhase("off");
    } else {
      setPhase("failed");
    }
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    setPhase("reading");
    setProblem("");
    setSaved(false);
    try {
      setPreview(URL.createObjectURL(file));
      const small = await resizeToJpeg(file);
      const path = await uploadPhoto(ctx.appId, small);
      setPhotoPath(path);
      await runSee(path);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Photo failed.");
      setPhase("empty");
    }
  }

  async function save() {
    if (!saveTo || !photoPath) return;
    setSaveBusy(true);
    setProblem("");
    const data: Record<string, unknown> = {};
    for (const noun of seeNouns) data[saveTo.counts[noun]] = counts[noun] ?? 0;
    if (saveTo.photo) data[saveTo.photo] = photoPath;
    try {
      const result = await createRecord(ctx.appId, saveTo.collection, data);
      if (!result.ok) {
        setProblem(result.error);
      } else {
        setSaved(true);
        ctx.refresh();
      }
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaveBusy(false);
    }
  }

  const busy = phase === "reading";
  const showCounts = (phase === "done" || phase === "off") && photoPath !== null;

  return (
    <div className="flex flex-col items-start gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-label="Take or choose a photo"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      {preview !== null && (
        <div className="relative w-full">
          <img src={preview} alt="" className="w-full rounded-[12px]" />
          {phase === "done" && dims !== null && nouns !== null && (
            <svg
              viewBox={`0 0 ${dims.w} ${dims.h}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              {nouns.map((n, ni) =>
                hidden.includes(n.noun)
                  ? null
                  : n.objects.map((o, oi) =>
                      o.path === "" ? null : (
                        <g
                          key={`${ni}-${oi}`}
                          transform={`translate(${o.box[0]},${o.box[1]})`}
                        >
                          <path
                            d={o.path}
                            fill={`var(--n${ni + 1})`}
                            fillOpacity={0.25}
                            stroke={`var(--n${ni + 1})`}
                            strokeWidth={2}
                            vectorEffect="non-scaling-stroke"
                          />
                        </g>
                      ),
                    ),
              )}
            </svg>
          )}
        </div>
      )}
      {busy && (
        <Status tone="muted">Looking for {seeNouns.join(", ")}…</Status>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className={btn.quiet}
      >
        {busy ? "Reading…" : preview ? "Change photo" : "Take or choose a photo"}
      </button>
      <DataNotice />
      {phase === "done" && nouns !== null && (
        <div className="flex flex-wrap gap-2">
          {nouns.map((n, ni) => (
            <button
              key={n.noun}
              type="button"
              aria-pressed={!hidden.includes(n.noun)}
              onClick={() =>
                setHidden((h) =>
                  h.includes(n.noun)
                    ? h.filter((x) => x !== n.noun)
                    : [...h, n.noun],
                )
              }
              className={`${btn.quiet} ${btn.small}`}
            >
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: `var(--n${ni + 1})` }}
              />
              {n.noun} · {counts[n.noun] ?? n.count}
            </button>
          ))}
        </div>
      )}
      {phase === "off" && (
        <Status tone="muted">
          Counting is off right now (no model key). Type the counts yourself.
        </Status>
      )}
      {showCounts && (
        <div className="flex flex-wrap gap-3">
          {seeNouns.map((noun) => (
            <label key={noun} className="flex items-center gap-1.5 text-sm">
              {noun}
              <input
                type="number"
                inputMode="numeric"
                min={0}
                aria-label={`${noun} count`}
                value={counts[noun] ?? 0}
                onChange={(e) => {
                  const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                  setCounts((c) => ({ ...c, [noun]: v }));
                }}
                className="w-16 rounded-[8px] border-[1.5px] border-line bg-card px-2 py-1 text-ink"
              />
            </label>
          ))}
        </div>
      )}
      {phase === "failed" && (
        <div className="flex flex-col items-start gap-2">
          <Status tone="bad">The model didn&apos;t answer. Try again.</Status>
          {photoPath !== null && (
            <button
              type="button"
              onClick={() => void runSee(photoPath)}
              className={btn.quiet}
            >
              Try again
            </button>
          )}
        </div>
      )}
      {showCounts && saveTo && (
        <button
          type="button"
          disabled={saveBusy}
          onClick={() => void save()}
          className={btn.primary}
        >
          {saveBusy ? "Saving…" : "Save counts"}
        </button>
      )}
      {problem !== "" && <Status tone="bad">{problem}</Status>}
      {saved && <Status tone="ok">Saved.</Status>}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { logEvent, signPhotoPaths } from "@/app/projects/[id]/actions";
import { btn, DataNotice, Status } from "@/components/ui";
import type { BlockProps } from "../runtime/registry";

export default function Draw({ block, records, ctx }: BlockProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [fresh, setFresh] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [keyOff, setKeyOff] = useState(false);
  const [failedId, setFailedId] = useState<string | null>(null);

  useEffect(() => {
    if (!("imageField" in block)) return;
    const field = block.imageField;
    let live = true;
    const paths = [
      ...new Set(
        [
          ...records
            .slice(0, 6)
            .map((r) => ((r.data ?? {}) as Record<string, unknown>)[field]),
          ...Object.values(fresh),
        ].filter((p): p is string => typeof p === "string" && p !== ""),
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

  if (block.type !== "draw") return null;
  const imageField = block.imageField;
  const titleField = block.titleField;
  const shown = records.slice(0, 6);

  async function drawFor(recordId: string, redo: boolean) {
    setBusyId(recordId);
    setFailedId(null);
    let res: Response;
    try {
      res = await fetch("/api/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: ctx.appId,
          blockId: block.id,
          recordId,
          redo,
        }),
      });
    } catch {
      setFailedId(recordId);
      setBusyId(null);
      return;
    }
    if (res.status === 503) {
      setKeyOff(true);
      setBusyId(null);
      return;
    }
    if (!res.ok) {
      setFailedId(recordId);
      setBusyId(null);
      return;
    }
    const data = (await res.json()) as { imagePath: string };
    void logEvent(ctx.appId, "drawn", {});
    setFresh((f) => ({ ...f, [recordId]: data.imagePath }));
    const signed = await signPhotoPaths([data.imagePath]);
    if (signed.ok) setUrls((u) => ({ ...u, ...signed.urls }));
    setBusyId(null);
    ctx.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {shown.length === 0 && <p className="text-muted">Nothing here yet.</p>}
      <div className="grid grid-cols-2 gap-3">
        {shown.map((r) => {
          const data = (r.data ?? {}) as Record<string, unknown>;
          const rawTitle = String(data[titleField] ?? "").trim();
          const title = rawTitle === "" ? "Untitled" : rawTitle;
          const stored = data[imageField];
          const path =
            fresh[r.id] ??
            (typeof stored === "string" ? stored : "");
          return (
            <div key={r.id} className="flex flex-col items-start gap-1.5">
              {path !== "" && urls[path] ? (
                <img
                  src={urls[path]}
                  alt=""
                  className="aspect-square w-full rounded-[12px] object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="checker flex aspect-square w-full items-center justify-center rounded-[12px]"
                >
                  <span className="font-display text-3xl text-muted">
                    {title.charAt(0).toUpperCase()}
                  </span>
                </span>
              )}
              <p className="font-display">{title}</p>
              {!keyOff && (
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void drawFor(r.id, path !== "")}
                  aria-label={`Draw a picture for ${title}`}
                  className={`${btn.quiet} ${btn.small}`}
                >
                  {busyId === r.id
                    ? "Muse Image is drawing…"
                    : path !== ""
                      ? "Draw again"
                      : "Draw it"}
                </button>
              )}
              {failedId === r.id && (
                <Status tone="bad">The model didn&apos;t answer. Try again.</Status>
              )}
            </div>
          );
        })}
      </div>
      {keyOff && (
        <Status tone="muted">
          Pictures are off right now (no model key).
        </Status>
      )}
      <DataNotice />
    </div>
  );
}

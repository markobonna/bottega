"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LiveStage } from "@/lib/design/project-art";

import "@/vendor/bottega/core.js";
import "@/vendor/bottega/types.js";
import "@/vendor/bottega/art/common.js";
import "@/vendor/bottega/art/world.js";
import { BIcon } from "./Dialog";

export interface SceneWorkshop {
  id: string;
  name: string;
  type: string;
  slot: number;
  stage: "built" | "sketch";
  lastActivity: number | null;
  projects: { id: string; name: string; stage: LiveStage }[];
}

export function wsMeta(w: SceneWorkshop): { dot: string; text: string } {
  const B = window.B;
  if (w.stage === "sketch" && !w.projects.length)
    return { dot: "ink", text: "still being drawn…" };
  const n = w.projects.length;
  const busy = w.projects.some(
    (p) => p.stage === "build" || p.stage === "sketch",
  );
  const coming = w.projects.some((p) => p.stage === "sent");
  const lit = B.isLit(w);
  const bits = [`${n} project${n === 1 ? "" : "s"}`];
  if (coming) bits.push("delivery coming");
  else if (busy) bits.push("apprentice working");
  else if (lit) bits.push("lights on");
  return {
    dot: w.stage === "sketch" ? "ink" : coming ? "sent" : "full",
    text: bits.join(" · "),
  };
}

export default function WorldScene({
  workshops,
  version,
  empty,
  onNewWorkshop,
}: {
  workshops: SceneWorkshop[];
  version: string;
  empty: boolean;
  onNewWorkshop: () => void;
}) {
  const B = window.B;
  const [sketchingId] = useState<string | null>(() => {
    const v = sessionStorage.getItem("bottega:new-workshop");
    sessionStorage.removeItem("bottega:new-workshop");
    return v;
  });
  const art = useMemo(() => {
    const used = new Set(workshops.map((w) => w.slot));
    let free = -1;
    for (let i = 0; i < 4; i++) {
      if (!used.has(i)) {
        free = i;
        break;
      }
    }
    window.B.store = { freeSlot: () => free };
    return window.B.art.world(
      { workshops },
      sketchingId ? { sketchingId } : {},
    );
    // Memoized on a server-computed version string, per the art contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return (
    <div className="b-scope">
      <div className="scene-pan">
        <div className="scene world" style={{ aspectRatio: art.aspect }}>
          <div
            style={{ display: "contents" }}
            dangerouslySetInnerHTML={{ __html: art.svg }}
          />
          {art.tags.map(({ ws, x, y }) => {
            const full = workshops.find((w) => w.id === ws.id);
            const m = full
              ? wsMeta(full)
              : { dot: "full", text: "" };
            const hot =
              full?.projects.some((p) => p.stage === "build") ?? false;
            return (
              <Link
                key={ws.id}
                href={`/workshops/${ws.id}`}
                className={`tag${full?.stage === "sketch" ? " is-sketch" : ""}${hot ? " is-hot" : ""}${sketchingId === ws.id ? " is-new" : ""}`}
                style={{ left: x, top: y }}
              >
                <span className="name">{ws.name}</span>
                <span className="meta">
                  <span className={`dot ${m.dot}`} aria-hidden="true" />
                  {m.text}
                </span>
              </Link>
            );
          })}
          {art.lot && (
            <button
              type="button"
              onClick={onNewWorkshop}
              className="btn btn-primary lot-btn"
              style={{ left: art.lot.x, top: art.lot.y }}
            >
              <BIcon svg={B.icon("plus", 18, 2.4)} />{" "}
              {empty ? "Build your first workshop" : "Build a workshop"}
            </button>
          )}
        </div>
      </div>
      <p className="pan-hint">Drag sideways to look around.</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo } from "react";

import "@/vendor/bottega/core.js";
import "@/vendor/bottega/types.js";
import "@/vendor/bottega/art/common.js";
import "@/vendor/bottega/art/world.js";

export interface SceneWorkshop {
  id: string;
  name: string;
  type: string;
  slot: number;
  stage: "built" | "sketch";
  lastActivity: number | null;
  projects: { id: string; name: string }[];
}

export default function WorldScene({
  workshops,
  version,
}: {
  workshops: SceneWorkshop[];
  version: string;
}) {
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
    return window.B.art.world({ workshops }, {});
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
            const n = full?.projects.length ?? 0;
            return (
              <Link
                key={ws.id}
                href={`/workshops/${ws.id}`}
                className="tag"
                style={{ left: x, top: y }}
              >
                <span className="name">{ws.name}</span>
                <span className="meta">
                  {n === 1 ? "1 project" : `${n} projects`}
                </span>
              </Link>
            );
          })}
          {art.lot && (
            <a
              href="#start-workshop"
              className="btn btn-primary lot-btn"
              style={{ left: art.lot.x, top: art.lot.y }}
            >
              Build a Workshop
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

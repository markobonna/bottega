"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

import "@/vendor/bottega/core.js";
import "@/vendor/bottega/types.js";
import "@/vendor/bottega/art/common.js";
import "@/vendor/bottega/art/room.js";
import "@/vendor/bottega/art/board.js";
import type { DesignMedium } from "@/lib/design/project-art";

export interface BoardDraft {
  n: number;
  label: string;
  stage: "sketch" | "shape" | "build" | "arrived";
}

function Icon({ svg }: { svg: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ display: "inline-flex", flex: "none" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function BoardPanel({
  project,
  drafts,
  tagline,
  backTo,
  newIn,
  version,
}: {
  project: { name: string; medium: DesignMedium; stage: string };
  drafts: BoardDraft[];
  tagline: string;
  backTo: { id: string; name: string };
  newIn: string;
  version: string;
}) {
  const B = window.B;
  const medium = B.MEDIUMS[project.medium] ?? B.MEDIUMS.hardware;
  const si = B.STAGES.indexOf(project.stage);
  const [mode, setMode] = useState<string | null>(null);
  const [tool, setTool] = useState<string>(medium.tools[0][0]);
  const [part, setPart] = useState<number>(1);
  const shown = mode ?? B.art.modeForStage(project.stage);

  const art = useMemo(
    () => B.art.board(project, shown),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, shown],
  );
  const thumbs = useMemo(
    () =>
      drafts.map((d) =>
        B.art.board(project, B.art.modeForStage(d.stage), {
          thumb: true,
          stage: d.stage,
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const labels = ["Sketched", "Shaped", "Built", medium.sentLabel, medium.arrivedLabel];
  const activePart = art.parts.find((x) => x.n === part);
  const arrived = project.stage === "arrived";

  return (
    <div className="b-scope">
      <section className="intro">
        <div style={{ minWidth: 0 }}>
          <Link href={`/workshops/${backTo.id}`} className="link-back">
            <Icon svg={B.icon("back")} /> Back to {backTo.name}
          </Link>
          <h1 className="title">{project.name}</h1>
          <p className="lede" style={{ marginTop: 6 }}>
            {medium.label} · Draft {drafts.length}
            {tagline ? ` · ${tagline}` : ""}
          </p>
        </div>
        <div
          className="actions"
          style={{ flexDirection: "column", alignItems: "flex-end" }}
        >
          <ol className="stages" aria-label="Progress">
            {labels.map((l, i) => (
              <Fragment key={l}>
                {i > 0 && (
                  <li aria-hidden="true" className={`bar${i > si ? " todo" : ""}`} />
                )}
                <li
                  className={i === si ? "now" : i > si ? "todo-label" : ""}
                  aria-current={i === si ? "step" : undefined}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    aria-hidden="true"
                  >
                    {i < si ? (
                      <circle cx="9" cy="9" r="7" fill="#33261A" />
                    ) : i === si ? (
                      <>
                        <circle
                          cx="9"
                          cy="9"
                          r="7"
                          fill="none"
                          stroke="#A23E25"
                          strokeWidth="1.6"
                        />
                        <path d="M9 2 A7 7 0 0 0 9 16 Z" fill="#A23E25" />
                      </>
                    ) : (
                      <circle
                        cx="9"
                        cy="9"
                        r="7"
                        fill="none"
                        stroke="#5E4A36"
                        strokeWidth="1.6"
                        strokeDasharray="2.5 2.5"
                      />
                    )}
                  </svg>
                  {i === si && project.stage === "build"
                    ? "Building, half way"
                    : l}
                </li>
              </Fragment>
            ))}
          </ol>
        </div>
      </section>

      {arrived && (
        <div className="card statuscard" style={{ marginBottom: 16, borderColor: "var(--verd)" }}>
          <Icon svg={B.icon("check", 28)} />
          <div className="grow">
            <strong>{medium.arrivedLabel}</strong>
            <div className="small">
              It&apos;s in {backTo.name} now, ready to use.
            </div>
          </div>
          <Link href={`/workshops/${backTo.id}`} className="btn">
            See it in the room
          </Link>
          <Link
            href={`/new?workshop=${newIn}`}
            className="btn btn-primary"
          >
            <Icon svg={B.icon("plus")} /> Next project
          </Link>
        </div>
      )}

      <section className="bench">
        <div className="boardcol">
          <div className="toolbar" role="toolbar" aria-label={`${medium.label} tools`}>
            <span className="lab">{medium.label} tools</span>
            {medium.tools.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="tool"
                aria-pressed={tool === id}
                onClick={() => setTool(id)}
              >
                <Icon svg={B.icon(id === "sketch" ? "pencil" : id, 18, 1.9)} />{" "}
                {label}
              </button>
            ))}
          </div>
          <div className="board">
            <div
              style={{ display: "contents" }}
              dangerouslySetInnerHTML={{ __html: art.svg }}
            />
            {si < 3 &&
              art.parts.map((pt) => (
                <button
                  key={pt.n}
                  type="button"
                  className="callout"
                  style={{ left: `${pt.x / 10}%`, top: `${(pt.y / 750) * 100}%` }}
                  aria-pressed={part === pt.n}
                  aria-label={`Part ${pt.n}: ${pt.label}`}
                  onClick={() => setPart(pt.n)}
                >
                  {pt.n}
                </button>
              ))}
            <p className="caption">
              {art.caption} · draft {drafts.length}
            </p>
            {arrived && <p className="stamp">{medium.arrivedLabel}</p>}
          </div>
          <div className="belowboard">
            <div className="seg" role="group" aria-label="How to show the drawing">
              {[
                ["ink", "Ink only"],
                ["built", "As built"],
                ["render", "Full render"],
              ].map(([id, l]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={shown === id}
                  onClick={() => setMode(id)}
                >
                  {l}
                </button>
              ))}
            </div>
            <p className="small" style={{ margin: 0 }}>
              {activePart && si < 3
                ? `Part ${activePart.n}: ${activePart.label}.`
                : "The drawing, from your project."}
            </p>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 36, paddingBottom: 40 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "8px 24px",
          }}
        >
          <h2 className="h2">Drafts on the wall</h2>
          <p className="small" style={{ margin: 0 }}>
            Every version stays pinned. Tap one to look at it.
          </p>
        </div>
        <ol className="drafts">
          {drafts.map((d, i) => {
            const cur = i === drafts.length - 1;
            return (
              <li key={d.n}>
                <button
                  type="button"
                  className={`draft${cur ? " current" : ""}`}
                  aria-current={cur ? "true" : undefined}
                  onClick={() => setMode(B.art.modeForStage(d.stage))}
                >
                  <span
                    style={{ display: "contents" }}
                    dangerouslySetInnerHTML={{ __html: thumbs[i].svg }}
                  />
                  <strong>
                    Draft {d.n} · {d.label}
                  </strong>
                  <span
                    className="small"
                    style={
                      cur
                        ? { color: "var(--red)", fontWeight: 700 }
                        : undefined
                    }
                  >
                    {cur
                      ? "On the bench now"
                      : d.stage === "sketch"
                        ? "Ink sketch"
                        : d.stage === "shape"
                          ? "Shape set"
                          : d.stage === "build"
                            ? "Half built"
                            : "Finished"}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

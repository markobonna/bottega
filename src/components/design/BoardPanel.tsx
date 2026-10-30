"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  advanceStage,
  markArrived,
  type ProjectNote,
} from "@/app/projects/[id]/actions";
import {
  arrivalHead,
  arrivalLine,
  type DesignMedium,
  type LiveStage,
} from "@/lib/design/project-art";

import "@/vendor/bottega/core.js";
import "@/vendor/bottega/types.js";
import "@/vendor/bottega/art/common.js";
import "@/vendor/bottega/art/room.js";
import "@/vendor/bottega/art/board.js";
import ArrivalDialog from "./ArrivalDialog";
import { BIcon } from "./Dialog";
import MarginNotes from "./MarginNotes";
import SendOffDialog from "./SendOffDialog";

export interface BoardDraft {
  n: number;
  label: string;
  stage: "sketch" | "shape" | "build" | "arrived";
}

const CRATE_SVG = `<svg width="44" height="40" viewBox="0 0 44 40" aria-hidden="true"><path d="M4 14 L22 6 L40 14 V34 L22 39 L4 34 Z" fill="#D9B47A" stroke="#33261A" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 14 L22 20 L40 14 M22 20 V39" fill="none" stroke="#33261A" stroke-width="1.6"/></svg>`;

function countdownTo(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return "any day now";
  const days = Math.floor(ms / 86400000);
  if (days >= 2) return `in ${days} days`;
  if (days === 1) return "tomorrow";
  const hours = Math.floor(ms / 3600000);
  if (hours >= 2) return `in ${hours} hours`;
  return "very soon";
}

export default function BoardPanel({
  appId,
  project,
  drafts,
  notes,
  tagline,
  backTo,
  newIn,
  workshopType,
  order,
  arriveAt,
  showArrival,
  lines,
  version,
}: {
  appId: string;
  project: { name: string; medium: DesignMedium; stage: LiveStage };
  drafts: BoardDraft[];
  notes: ProjectNote[];
  tagline: string;
  backTo: { id: string; name: string };
  newIn: string;
  workshopType: string;
  order: { vendor: string; price: number; lead: number } | null;
  arriveAt: string | null;
  showArrival: boolean;
  lines?: string[];
  version: string;
}) {
  const B = window.B;
  const router = useRouter();
  const medium = B.MEDIUMS[project.medium] ?? B.MEDIUMS.hardware;
  const si = B.STAGES.indexOf(project.stage);
  const [mode, setMode] = useState<string | null>(null);
  const [tool, setTool] = useState<string>(medium.tools[0][0]);
  const [part, setPart] = useState<number>(1);
  const [sending, setSending] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [problem, setProblem] = useState("");
  const shown = mode ?? B.art.modeForStage(project.stage);

  const artProject = useMemo(
    () => ({
      name: project.name,
      medium: project.medium,
      stage: project.stage,
      ...(lines?.length ? { lines } : {}),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
  const art = useMemo(
    () => B.art.board(artProject, shown),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, shown],
  );
  const thumbs = useMemo(
    () =>
      drafts.map((d) =>
        B.art.board(artProject, B.art.modeForStage(d.stage), {
          thumb: true,
          stage: d.stage,
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const labels = [
    "Sketched",
    "Shaped",
    "Built",
    medium.sentLabel,
    medium.arrivedLabel,
  ];
  const partsWithNotes = new Set(
    notes.filter((n) => n.part).map((n) => n.part as number),
  );
  const partLabel = (n: number) =>
    art.parts.find((x) => x.n === n)?.label ?? "the drawing";
  const activePart = art.parts.find((x) => x.n === part);
  const arrived = project.stage === "arrived";
  const sent = project.stage === "sent";

  async function advance() {
    if (advancing) return;
    setAdvancing(true);
    setProblem("");
    const res = await advanceStage(appId);
    setAdvancing(false);
    if (!res.ok) {
      setProblem("Couldn't move it forward. Try again.");
      return;
    }
    router.refresh();
  }

  async function arrivedTap() {
    if (advancing) return;
    setAdvancing(true);
    const res = await markArrived(appId);
    setAdvancing(false);
    if (!res.ok) {
      setProblem("Couldn't save that. Try again.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="b-scope">
      <section className="intro">
        <div style={{ minWidth: 0 }}>
          <Link href={`/workshops/${backTo.id}`} className="link-back">
            <BIcon svg={B.icon("back")} /> Back to {backTo.name}
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
                  <li
                    aria-hidden="true"
                    className={`bar${i > si ? " todo" : ""}`}
                  />
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
          {si === 0 && (
            <div>
              <button
                type="button"
                className="btn btn-dark"
                disabled={advancing}
                onClick={() => void advance()}
              >
                <BIcon svg={B.icon("check")} /> Looks good — firm it up
              </button>
            </div>
          )}
          {si === 1 && (
            <div>
              <button
                type="button"
                className="btn btn-dark"
                disabled={advancing}
                onClick={() => void advance()}
              >
                <BIcon svg={B.icon("parts")} /> Start building
              </button>
            </div>
          )}
          {si === 2 && (
            <div>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => setSending(true)}
              >
                <BIcon svg={B.icon("crate")} />{" "}
                {medium.flow === "ship" ? "Build and install" : "Send it off"}
              </button>
            </div>
          )}
          {problem !== "" && (
            <p className="small" style={{ margin: 0, color: "var(--red)" }}>
              {problem}
            </p>
          )}
        </div>
      </section>

      {sent && (
        <div
          className="card statuscard"
          style={{ marginBottom: 16 }}
        >
          <BIcon svg={CRATE_SVG} />
          <div className="grow">
            <strong>
              {medium.flow === "quote"
                ? `On its way${order ? ` from ${order.vendor}` : ""}`
                : "Finishing up"}
            </strong>
            <div className="small">
              {order
                ? `$${order.price.toLocaleString()} · ${order.lead} week${order.lead > 1 ? "s" : ""} lead time. `
                : ""}
              {arriveAt ? `Arriving ${countdownTo(arriveAt)}.` : ""}
            </div>
          </div>
          <button
            type="button"
            className="btn"
            disabled={advancing}
            onClick={() => void arrivedTap()}
          >
            It arrived
          </button>
        </div>
      )}
      {arrived && (
        <div
          className="card statuscard"
          style={{ marginBottom: 16, borderColor: "var(--verd)" }}
        >
          <BIcon svg={B.icon("check", 28)} />
          <div className="grow">
            <strong>
              {medium.arrivedLabel}
              {order ? ` — from ${order.vendor}` : ""}
            </strong>
            <div className="small">
              It&apos;s in {backTo.name} now, ready to use.
            </div>
          </div>
          <Link href={`/workshops/${backTo.id}`} className="btn">
            See it in the room
          </Link>
          <Link href={`/new?workshop=${newIn}`} className="btn btn-primary">
            <BIcon svg={B.icon("plus")} /> Next project
          </Link>
        </div>
      )}

      <section className="bench">
        <div className="boardcol">
          <div
            className="toolbar"
            role="toolbar"
            aria-label={`${medium.label} tools`}
          >
            <span className="lab">{medium.label} tools</span>
            {medium.tools.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="tool"
                aria-pressed={tool === id}
                onClick={() => setTool(id)}
              >
                <BIcon svg={B.icon(id === "sketch" ? "pencil" : id, 18, 1.9)} />{" "}
                {label}
              </button>
            ))}
          </div>
          <div className="board">
            <div
              style={{ display: "contents" }}
              dangerouslySetInnerHTML={{ __html: art.svg }}
            />
            {art.parts
              .filter((pt) => partsWithNotes.has(pt.n) || si < 3)
              .map((pt) => (
                <button
                  key={pt.n}
                  type="button"
                  className="callout"
                  style={{
                    left: `${pt.x / 10}%`,
                    top: `${(pt.y / 750) * 100}%`,
                  }}
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
            <div
              className="seg"
              role="group"
              aria-label="How to show the drawing"
            >
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
              {activePart
                ? `Part ${activePart.n}: ${activePart.label}.`
                : "The drawing, from your project."}
            </p>
          </div>
        </div>
        <MarginNotes
          appId={appId}
          medium={project.medium}
          initial={notes}
          activePart={part}
          onPart={setPart}
          partLabel={partLabel}
          locked={si >= 3}
        />
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

      {sending && (
        <SendOffDialog
          appId={appId}
          project={{
            name: project.name,
            medium: project.medium,
            tagline,
          }}
          workshopName={backTo.name}
          stageLabel={(() => {
            const idx = B.STAGES.indexOf(project.stage);
            return labels[Math.max(0, idx)];
          })()}
          notes={notes.map((n) => ({
            who: n.who,
            part: n.part,
            text: n.text,
          }))}
          drafts={drafts}
          onClose={() => {
            setSending(false);
            router.refresh();
          }}
        />
      )}
      {showArrival && (
        <ArrivalDialog
          appId={appId}
          project={{ name: project.name, medium: project.medium }}
          workshop={{ id: backTo.id, name: backTo.name, type: workshopType }}
          head={arrivalHead(project.medium)}
          line={arrivalLine(
            workshopType,
            backTo.name,
            project.name,
            project.medium,
          )}
          arrivedLabel={medium.arrivedLabel}
        />
      )}
    </div>
  );
}

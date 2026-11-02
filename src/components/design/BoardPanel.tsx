"use client";

import Link from "next/link";
import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  advanceStage,
  goBackStage,
  markArrived,
  savePromise,
  type ProjectNote,
} from "@/app/projects/[id]/actions";
import {
  arrivalHead,
  arrivalLine,
  type DesignMedium,
  type LiveStage,
} from "@/lib/design/project-art";
import { buildPackFiles } from "@/lib/design/pack-files";
import { stageLabelsFor, toolIcon, toolsFor } from "@/lib/design/tools";

import "@/vendor/bottega/core.js";
import "@/vendor/bottega/types.js";
import "@/vendor/bottega/art/common.js";
import "@/vendor/bottega/art/room.js";
import "@/vendor/bottega/art/board.js";
import ArrivalDialog from "./ArrivalDialog";
import BuildGallery from "./BuildGallery";
import ConciergeCard from "./ConciergeCard";
import { BIcon } from "./Dialog";
import MarginNotes from "./MarginNotes";
import LookPainter from "./LookPainter";
import SketchPending from "./SketchPending";
import PackFileList from "./PackFileList";
import SendOffDialog from "./SendOffDialog";

export interface BoardDraft {
  n: number;
  label: string;
  stage: "sketch" | "shape" | "build" | "arrived";
}

const CRATE_SVG = `<svg width="44" height="40" viewBox="0 0 44 40" aria-hidden="true"><path d="M4 14 L22 6 L40 14 V34 L22 39 L4 34 Z" fill="#D9B47A" stroke="#33261A" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 14 L22 20 L40 14 M22 20 V39" fill="none" stroke="#33261A" stroke-width="1.6"/></svg>`;

function countdownTo(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return "any day now";
  if (ms <= 0) {
    const late = Math.floor(-ms / 86400000);
    if (late < 1) return "any day now";
    return `${late} day${late > 1 ? "s" : ""} overdue`;
  }
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
  arrivalPhotoUrl,
  showArrival,
  lines,
  shipTarget,
  photoUrls,
  photoPaths,
  lookMissing,
  sketchMissing,
  sketchUrl,
  lookUrl,
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
  order: {
    vendors: { name: string; contact: string; address: string }[];
    sentAt: string | null;
  } | null;
  arriveAt: string | null;
  arrivalPhotoUrl: string | null;
  showArrival: boolean;
  lines?: string[];
  shipTarget?: string;
  photoUrls: string[];
  photoPaths: string[];
  lookMissing: boolean;
  sketchMissing: boolean;
  sketchUrl: string | null;
  lookUrl: string | null;
  version: string;
}) {
  const B = window.B;
  const router = useRouter();
  const medium = B.MEDIUMS[project.medium] ?? B.MEDIUMS.hardware;
  const tools = toolsFor(project.medium, medium.tools);
  const si = B.STAGES.indexOf(project.stage);
  const [mode, setMode] = useState<string | null>(null);
  const [tool, setTool] = useState<string>(tools[0][0]);
  const [part, setPart] = useState<number>(1);
  const [sending, setSending] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [problem, setProblem] = useState("");
  const [promise, setPromise] = useState("");
  const [savingPromise, setSavingPromise] = useState(false);
  const shown = mode ?? B.art.modeForStage(project.stage);

  useEffect(() => {
    if (si !== 2) return;
    const onSendoff = () => setSending(true);
    window.addEventListener("bottega:sendoff", onSendoff);
    return () => window.removeEventListener("bottega:sendoff", onSendoff);
  }, [si]);

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

  const labels = stageLabelsFor(
    project.medium,
    medium.sentLabel,
    medium.arrivedLabel,
  );
  const packFiles = useMemo(
    () =>
      buildPackFiles({
        name: project.name,
        medium: project.medium,
        tagline,
        workshopName: backTo.name,
        stageLabel: labels[si] ?? labels[0],
        notes,
        drafts,
        tools,
        flow: medium.flow,
        kindLabel: medium.label,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
  const partsWithNotes = new Set(
    notes.filter((n) => n.part).map((n) => n.part as number),
  );
  const partLabel = (n: number) =>
    art.parts.find((x) => x.n === n)?.label ?? "the drawing";
  const activePart = art.parts.find((x) => x.n === part);
  // Generated art replaces the template drawing: the B&W sketch at the
  // sketch stage, the color render after. While art is expected but not
  // here yet, a countdown holds the board; the template (with its pins)
  // appears only when art was proven unavailable (no key, failed paint).
  const [artFailed, setArtFailed] = useState(false);
  const boardPhoto =
    project.stage === "sketch" ? sketchUrl : (lookUrl ?? sketchUrl);
  const photoKind =
    boardPhoto && boardPhoto === sketchUrl ? "Sketch" : "Render";
  const pendingKind = project.stage === "sketch" ? "Sketch" : "Render";
  const boardPending =
    !boardPhoto && (sketchMissing || lookMissing) && !artFailed;
  const reviseTarget = boardPhoto
    ? photoKind === "Sketch"
      ? ("sketch" as const)
      : ("portrait" as const)
    : null;
  const [instruction, setInstruction] = useState("");
  const [revising, setRevising] = useState(false);
  const [reviseProblem, setReviseProblem] = useState("");

  async function revise() {
    const clean = instruction.trim().slice(0, 300);
    if (clean.length < 3 || revising || !reviseTarget) return;
    setRevising(true);
    setReviseProblem("");
    try {
      const res = await fetch("/api/project-revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, target: reviseTarget, instruction: clean }),
      });
      if (res.status === 503) {
        setReviseProblem("Revising is off right now (no model key).");
        return;
      }
      if (!res.ok) throw new Error("revise failed");
      if (reviseTarget === "sketch") {
        // The portrait grew from the old sketch: regrow it so the
        // lineage holds.
        const grown = await fetch("/api/project-portrait", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appId }),
        });
        if (!grown.ok && grown.status !== 503) throw new Error("regrow failed");
      }
      setInstruction("");
      router.refresh();
    } catch {
      setReviseProblem("Couldn't revise that. Try again.");
    } finally {
      setRevising(false);
    }
  }
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

  async function goBack() {
    if (advancing) return;
    setAdvancing(true);
    setProblem("");
    const res = await goBackStage(appId);
    setAdvancing(false);
    if (!res.ok) {
      setProblem("Couldn't move it back. Try again.");
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

  async function savePromiseDate(e: FormEvent) {
    e.preventDefault();
    if (!promise || savingPromise) return;
    setSavingPromise(true);
    setProblem("");
    const res = await savePromise(appId, promise);
    setSavingPromise(false);
    if (!res.ok) {
      setProblem("Couldn't save that date. Try again.");
      return;
    }
    router.refresh();
  }

  function vendorLink(v: { name: string; contact: string; address: string }) {
    if (v.contact === "email" && v.address.includes("@")) {
      return (
        <a
          href={`mailto:${v.address}?subject=${encodeURIComponent(`Checking in: ${project.name}`)}`}
        >
          {v.name}
        </a>
      );
    }
    if (v.contact === "phone") {
      return <a href={`tel:${v.address.replace(/[^+\d]/g, "")}`}>{v.name}</a>;
    }
    if (v.address) {
      const href = v.address.startsWith("http")
        ? v.address
        : `https://${v.address}`;
      return (
        <a href={href} target="_blank" rel="noreferrer">
          {v.name}
        </a>
      );
    }
    return <span>{v.name}</span>;
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
          <p className="small" style={{ marginTop: 6 }}>
            Say what you want below and Bottega builds it — or walk
            the steps with the buttons.
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
                  {l}
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
                <BIcon svg={B.icon("check")} /> Looks good — {labels[1]}
              </button>
            </div>
          )}
          {si === 1 && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn"
                disabled={advancing}
                onClick={() => void goBack()}
              >
                ← {labels[0]}
              </button>
              <button
                type="button"
                className="btn btn-dark"
                disabled={advancing}
                onClick={() => void advance()}
              >
                <BIcon svg={B.icon("check")} /> Next: {labels[2]}
              </button>
            </div>
          )}
          {si === 2 && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn"
                disabled={advancing}
                onClick={() => void goBack()}
              >
                ← {labels[1]}
              </button>
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
                ? `RFQs out${order ? ` to ${order.vendors.map((v) => v.name).join(", ")}` : ""}`
                : "Finishing up"}
            </strong>
            <div className="small">
              {medium.flow === "quote" && !arriveAt ? (
                <form
                  onSubmit={(e) => void savePromiseDate(e)}
                  style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
                >
                  <label htmlFor="promise-date">
                    Their reply promised it by…
                  </label>
                  <input
                    id="promise-date"
                    type="date"
                    value={promise}
                    disabled={savingPromise}
                    onChange={(e) => setPromise(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn"
                    disabled={!promise || savingPromise}
                  >
                    {savingPromise ? "Saving…" : "Count it down"}
                  </button>
                </form>
              ) : arriveAt ? (
                <>
                  Promised {countdownTo(arriveAt)}.{" "}
                  {new Date(arriveAt).getTime() < Date.now() - 86400000 &&
                    order && (
                      <>
                        Nudge them:{" "}
                        {order.vendors.map((v, i) => (
                          <Fragment key={v.name}>
                            {i > 0 && ", "}
                            {vendorLink(v)}
                          </Fragment>
                        ))}
                        .
                      </>
                    )}
                </>
              ) : (
                ""
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn"
              disabled={advancing}
              onClick={() => void goBack()}
            >
              ← {labels[2]}
            </button>
            <button
              type="button"
              className="btn"
              disabled={advancing}
              onClick={() => void arrivedTap()}
            >
              It arrived
            </button>
          </div>
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
              {labels[4]}
              {order ? ` — ${order.vendors.map((v) => v.name).join(", ")}` : ""}
            </strong>
            <div className="small">
              It&apos;s in {backTo.name} now, ready to use.
            </div>
            {arrivalPhotoUrl && (
              <img
                src={arrivalPhotoUrl}
                alt={`${project.name} arrived`}
                style={{ width: "100%", maxWidth: 320, borderRadius: 8, marginTop: 8 }}
              />
            )}
          </div>
          <button
            type="button"
            className="btn"
            disabled={advancing}
            onClick={() => void goBack()}
          >
            ← {labels[3]}
          </button>
          <Link href={`/workshops/${backTo.id}`} className="btn">
            See it in the room
          </Link>
          <Link href={`/new?workshop=${newIn}`} className="btn btn-primary">
            <BIcon svg={B.icon("plus")} /> Next project
          </Link>
        </div>
      )}
      {medium.flow === "ship" && arrived && (
        <div className="card statuscard" style={{ marginBottom: 16 }}>
          <BIcon svg={B.sigil(40)} />
          <div className="grow">
            <strong>Need a hand running this?</strong>
            <ConciergeCard
              appId={appId}
              idPrefix="board-ops"
              headline="Help requested"
              blurb="Bottega will operate this app for you — records in, changes made, day to day. Send this request and we'll reply within 48 hours."
              actionLabel="Request help"
              mailSubject={`Run it for me: ${project.name}`}
              mailContext={`Project: ${project.name}\nKind: ${medium.label}\nWorkshop: ${backTo.name}`}
            />
          </div>
        </div>
      )}

      <LookPainter
        appId={appId}
        sketchMissing={sketchMissing}
        lookMissing={lookMissing}
        onPhase={(p) => setArtFailed(p === "off" || p === "failed")}
      />
      <BuildGallery
        appId={appId}
        medium={project.medium}
        photoUrls={photoUrls}
        photoPaths={photoPaths}
      />
      <section className="bench">
        <div className="boardcol">
          <div
            className="toolbar"
            role="toolbar"
            aria-label={`${medium.label} tools`}
          >
            <span className="lab">{medium.label} tools</span>
            {tools.map(([id, label]) =>
              id === "preview" ? (
                <button
                  key={id}
                  type="button"
                  className="tool"
                  onClick={() => {
                    document
                      .getElementById("app-preview")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <BIcon svg={B.icon(toolIcon(id), 18, 1.9)} /> {label}
                </button>
              ) : (
                <button
                  key={id}
                  type="button"
                  className="tool"
                  aria-pressed={tool === id}
                  onClick={() => {
                    setTool(id);
                    document
                      .getElementById("margin-notes")
                      ?.scrollIntoView({ block: "nearest" });
                  }}
                >
                  <BIcon svg={B.icon(toolIcon(id), 18, 1.9)} /> {label}
                </button>
              ),
            )}
          </div>
          <div className="board">
            {revising ? (
              <SketchPending kind={photoKind} />
            ) : boardPending ? (
              <SketchPending kind={pendingKind} />
            ) : boardPhoto ? (
              <img
                src={boardPhoto}
                alt={`${project.name} ${photoKind.toLowerCase()}`}
                draggable={false}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <Fragment>
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
              </Fragment>
            )}
            <p className="caption">
              {boardPending
                ? `${pendingKind} · draft ${drafts.length}`
                : boardPhoto
                  ? `${photoKind} · draft ${drafts.length}`
                  : `${art.caption} · draft ${drafts.length}`}
            </p>
            {arrived && <p className="stamp">{medium.arrivedLabel}</p>}
          </div>
          <div className="belowboard">
            {!boardPhoto && !boardPending && (
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
            )}
            <p className="small" style={{ margin: 0 }}>
              {boardPending
                ? pendingKind === "Sketch"
                  ? "Sketch on its way — hold tight."
                  : "Render on its way — hold tight."
                : boardPhoto
                  ? photoKind === "Sketch"
                    ? "Sketch, drawn by Muse Image from your sentence."
                    : "Render, painted from the sketch."
                  : activePart
                    ? `Part ${activePart.n}: ${activePart.label}.`
                    : "The drawing, from your project."}
            </p>
            {reviseTarget && !revising && !boardPending && (
              <form
                className="composer"
                style={{ marginTop: 8 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  void revise();
                }}
              >
                <label
                  htmlFor="revise-input"
                  style={{ fontSize: 14, fontWeight: 700 }}
                >
                  Revise the {reviseTarget === "sketch" ? "sketch" : "render"}
                </label>
                <div className="row">
                  <input
                    id="revise-input"
                    type="text"
                    autoComplete="off"
                    maxLength={300}
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder={
                      reviseTarget === "sketch"
                        ? "e.g. wall-mount it, no feet"
                        : "e.g. brass finish, darker"
                    }
                  />
                  <button
                    type="submit"
                    className="btn"
                    disabled={instruction.trim().length < 3}
                  >
                    Revise
                  </button>
                </div>
                {reviseProblem !== "" && (
                  <p className="small" style={{ color: "var(--red)" }}>
                    {reviseProblem}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
        <MarginNotes
          appId={appId}
          medium={project.medium}
          initial={notes}
          activePart={boardPhoto || boardPending ? null : part}
          onPart={setPart}
          partLabel={partLabel}
          locked={si >= 3}
          topics={tools}
          topicId={tool}
        />
      </section>

      {si === 2 && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="h2">Your pack</h2>
          <p className="small" style={{ marginTop: 4 }}>
            The design turned into files. They go out with the send-off —
            or download them now.
          </p>
          <PackFileList files={packFiles} />
        </section>
      )}

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
            topic: n.topic,
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
            shipTarget,
          )}
          arrivedLabel={labels[4]}
        />
      )}
    </div>
  );
}

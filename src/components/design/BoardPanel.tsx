"use client";

import Link from "next/link";
import {
  Fragment,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  advanceStage,
  goBackStage,
  markArrived,
  savePromise,
  setFormFactor,
  type ProjectNote,
} from "@/app/projects/[id]/actions";
import {
  arrivalHead,
  arrivalLine,
  type DesignMedium,
  type LiveStage,
} from "@/lib/design/project-art";
import {
  renderSpecWireframe,
  type WireScreen,
} from "@/lib/design/spec-wireframe";
import { buildPackFiles } from "@/lib/design/pack-files";
import { inlineFiles } from "@/lib/software-build";
import {
  stageLabelsFor,
  stepLabel,
  stepPosition,
  toolIcon,
  toolsFor,
} from "@/lib/design/tools";
import type { DbRecord } from "@/lib/records";
import type { AppSpec } from "@/lib/spec/schema";
import AppRuntime from "../runtime/AppRuntime";
import type { RuntimeApp } from "../runtime/registry";

import "@/vendor/bottega/core.js";
import "@/vendor/bottega/types.js";
import "@/vendor/bottega/art/common.js";
import "@/vendor/bottega/art/room.js";
import "@/vendor/bottega/art/board.js";
import ArrivalDialog from "./ArrivalDialog";
import BuildGallery from "./BuildGallery";
import ConciergeCard from "./ConciergeCard";
import Dialog, { BIcon } from "./Dialog";
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
  runtime,
  wireScreens,
  formFactor,
  builtFiles,
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
  // Present only at software's Prototype step: the working app renders
  // in the board, above the spec wireframe.
  runtime?: {
    app: RuntimeApp;
    spec: AppSpec;
    records: Record<string, DbRecord[]>;
  };
  // The app's screens, for the software sketch (drawn from the spec).
  wireScreens?: WireScreen[];
  // Mobile or desktop, picked before the sketch shows. Null = unasked.
  formFactor: "mobile" | "desktop" | null;
  // Spark-built app files (revision 4 software). Absent for legacy
  // spec-built apps, which keep the classic wireframe + runtime.
  builtFiles?: { path: string; content: string }[];
}) {
  const B = window.B;
  const router = useRouter();
  const medium = B.MEDIUMS[project.medium] ?? B.MEDIUMS.hardware;
  const tools = toolsFor(project.medium, medium.tools);
  // Software step 1: new apps show the Spark-designed app itself;
  // legacy spec-built apps show the spec as a live wireframe.
  const specSketch = project.medium === "software";
  const si = B.STAGES.indexOf(project.stage);
  // Stepper position: software skips the Test slot.
  const pos = stepPosition(project.medium, si);
  // Revision 4 software carries Spark-built files; legacy spec-built apps
  // (seeds) keep the classic wireframe + runtime below.
  const hasFiles = specSketch && !!builtFiles?.length;
  const legacySpec =
    specSketch && !hasFiles && (wireScreens?.length ?? 0) > 0;
  // The shape question gates the sketch: no pick, no sketch.
  const needFactor = specSketch && si === 0 && !formFactor;
  const [factorBusy, setFactorBusy] = useState(false);
  const [factorProblem, setFactorProblem] = useState("");
  const [designing, setDesigning] = useState(false);
  const [fullView, setFullView] = useState(false);
  // The prototype phase lands app.js: until it does, the design is
  // static. Visiting the Prototype step builds it, once per design.
  const hasJs = specSketch && !!builtFiles?.some((f) => f.path === "app.js");
  const [protoBusy, setProtoBusy] = useState(false);
  const [protoProblem, setProtoProblem] = useState("");
  const protoKick = useRef("");
  const previewDoc = useMemo(
    () => (builtFiles?.length ? inlineFiles(builtFiles) : ""),
    [builtFiles],
  );

  async function pickFactor(factor: "mobile" | "desktop") {
    if (factorBusy || designing) return;
    if (legacySpec) {
      setFactorBusy(true);
      setFactorProblem("");
      const res = await setFormFactor(appId, factor);
      setFactorBusy(false);
      if (!res.ok) {
        setFactorProblem("Couldn't save that. Try again.");
        return;
      }
      router.refresh();
      return;
    }
    // New software: picking the shape designs the app. The countdown
    // holds the board while Spark works.
    setFactorBusy(true);
    setDesigning(true);
    setFactorProblem("");
    try {
      const res = await fetch("/api/software-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, formFactor: factor, phase: "design" }),
      });
      if (res.status === 503) {
        setFactorProblem(
          "Designing is off right now (no model key). Try again once a key is set.",
        );
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || "design failed");
      }
      router.refresh();
    } catch (e) {
      setFactorProblem(
        e instanceof Error && e.message !== "design failed"
          ? e.message
          : "Couldn't design that. Try again.",
      );
    } finally {
      setFactorBusy(false);
      setDesigning(false);
    }
  }
  async function runPrototype() {
    if (protoBusy) return;
    setProtoBusy(true);
    setProtoProblem("");
    try {
      const res = await fetch("/api/software-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId,
          formFactor: formFactor ?? "mobile",
          phase: "prototype",
        }),
      });
      if (res.status === 503) {
        setProtoProblem(
          "Prototyping is off right now (no model key). Try again once a key is set.",
        );
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || "prototype failed");
      }
      router.refresh();
    } catch (e) {
      setProtoProblem(
        e instanceof Error && e.message !== "prototype failed"
          ? e.message
          : "Couldn't build the prototype. Try again.",
      );
    } finally {
      setProtoBusy(false);
    }
  }
  useEffect(() => {
    // Auto-build on arrival at the Prototype step. The ref keys the
    // kick to the design's content, so a redesign re-kicks exactly
    // once while StrictMode's double-effect only kicks once.
    if (!(specSketch && si === 1 && hasFiles && !hasJs) || protoBusy) return;
    const key = `${appId}:${(builtFiles ?? []).map((f) => f.path).join(",")}:${(builtFiles?.find((f) => f.path === "index.html")?.content.length ?? 0)}`;
    if (protoKick.current === key) return;
    protoKick.current = key;
    void runPrototype();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specSketch, si, hasFiles, hasJs, appId]);
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
        stageLabel: stepLabel(labels, project.medium, si),
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
  const [paintSignal, setPaintSignal] = useState(0);
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
    // Stepping forward re-attempts still-missing art: without this the
    // once-per-session paint guard eats every retry and the board just
    // reshows the sketch. Only missing art refires.
    try {
      sessionStorage.removeItem(`bottega:sketch-${appId}`);
      sessionStorage.removeItem(`bottega:portrait-${appId}`);
    } catch {
      /* private mode: bump anyway */
    }
    setPaintSignal((n) => n + 1);
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
                    className={`bar${i > pos ? " todo" : ""}`}
                  />
                )}
                <li
                  className={i === pos ? "now" : i > pos ? "todo-label" : ""}
                  aria-current={i === pos ? "step" : undefined}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    aria-hidden="true"
                  >
                    {i < pos ? (
                      <circle cx="9" cy="9" r="7" fill="#33261A" />
                    ) : i === pos ? (
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
                disabled={
                  advancing ||
                  needFactor ||
                  (specSketch && !legacySpec && !hasFiles)
                }
                onClick={() => void advance()}
              >
                <BIcon svg={B.icon("check")} />{" "}
                {needFactor
                  ? "Pick mobile or desktop first"
                  : specSketch && !legacySpec && !hasFiles
                    ? "Design it first"
                    : `Looks good — ${labels[1]}`}
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
                {medium.flow === "ship" ? "Download" : "Send it off"}
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
              {medium.arrivedLabel}
              {order ? ` — ${order.vendors.map((v) => v.name).join(", ")}` : ""}
            </strong>
            <div className="small">
              {project.medium === "software"
                ? "The zip is yours — unzip it, double-click index.html, and it runs."
                : `It's in ${backTo.name} now, ready to use.`}
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
            ← {stepLabel(labels, project.medium, si - 1)}
          </button>
          {project.medium === "software" && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSending(true)}
            >
              <BIcon svg={B.icon("download")} /> Download again
            </button>
          )}
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

      {!specSketch && (
        <LookPainter
          appId={appId}
          sketchMissing={sketchMissing}
          lookMissing={lookMissing}
          onPhase={(p) => setArtFailed(p === "off" || p === "failed")}
          signal={paintSignal}
        />
      )}
      {project.medium !== "software" && (
        <BuildGallery
          appId={appId}
          medium={project.medium}
          photoUrls={photoUrls}
          photoPaths={photoPaths}
        />
      )}
      <section className="bench">
        <div className="boardcol">
          {runtime && (
            <>
              {specSketch && !formFactor && (
                <div
                  className="card"
                  style={{
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span className="small" style={{ margin: 0 }}>
                    Mobile or desktop? Pick the shape to frame this app:
                  </span>
                  {(["mobile", "desktop"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      className="chip"
                      disabled={factorBusy}
                      onClick={() => void pickFactor(f)}
                    >
                      {f === "mobile" ? "📱 Mobile" : "🖥️ Desktop"}
                    </button>
                  ))}
                  {factorProblem !== "" && (
                    <span
                      className="small"
                      style={{ margin: 0, color: "var(--red)" }}
                    >
                      {factorProblem}
                    </span>
                  )}
                </div>
              )}
              <div
                id="app-preview"
                className="card"
                style={{ scrollMarginTop: 12, padding: 16 }}
              >
                {hasFiles ? (
                  hasJs ? (
                    <>
                      <div
                        className={
                          formFactor === "desktop"
                            ? "device-desktop"
                            : "device-mobile"
                        }
                      >
                        <iframe
                          title={`${project.name} working prototype`}
                          sandbox="allow-scripts"
                          srcDoc={previewDoc}
                          style={{
                            width: "100%",
                            height: formFactor === "desktop" ? 560 : 620,
                            border: "none",
                            borderRadius: 8,
                            background: "#fff",
                          }}
                        />
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setFullView(true)}
                        >
                          Open fullscreen
                        </button>
                      </div>
                    </>
                  ) : protoBusy ? (
                    <div style={{ position: "relative", minHeight: 320 }}>
                      <SketchPending kind="Prototype" />
                    </div>
                  ) : (
                    <div className="card" style={{ padding: 20 }}>
                      <p className="hand" style={{ fontSize: 24, margin: 0 }}>
                        The prototype isn&apos;t wired up yet.
                      </p>
                      <p className="small" style={{ margin: "8px 0 0" }}>
                        {protoProblem !== ""
                          ? protoProblem
                          : "The design is ready — build the working version from it."}
                      </p>
                      <div style={{ marginTop: 12 }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => void runPrototype()}
                        >
                          Build the prototype
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div
                    className={
                      formFactor === "desktop"
                        ? "device-desktop"
                        : formFactor === "mobile"
                          ? "device-mobile"
                          : undefined
                    }
                  >
                    <Suspense
                      fallback={<p className="text-muted">Loading…</p>}
                    >
                      <AppRuntime
                        app={runtime.app}
                        spec={runtime.spec}
                        records={runtime.records}
                        embedded
                        layout={
                          formFactor === "mobile"
                            ? "phone"
                            : (formFactor ?? "auto")
                        }
                      />
                    </Suspense>
                  </div>
                )}
              </div>
              <p className="small" style={{ margin: 0 }}>
                {!hasFiles
                  ? `${stepLabel(labels, project.medium, si)} · draft ${drafts.length}${formFactor ? ` · ${formFactor}` : ""} — the working app, live. Tap through it; it runs on your data.`
                  : hasJs
                    ? `${stepLabel(labels, project.medium, si)} · draft ${drafts.length}${formFactor ? ` · ${formFactor}` : ""} — the working app, first pass. Tap through it; it runs on its own.`
                    : `${stepLabel(labels, project.medium, si)} · draft ${drafts.length}${formFactor ? ` · ${formFactor}` : ""} — the design, waiting on its wiring.`}
              </p>
            </>
          )}
          {specSketch ? (
            si === 0 ? (
              designing ? (
                <SketchPending kind="Design" />
              ) : needFactor ? (
                <div className="card" style={{ padding: 20 }}>
                  <p className="hand" style={{ fontSize: 24, margin: 0 }}>
                    Is this a mobile or a desktop app?
                  </p>
                  <p className="small" style={{ margin: "8px 0 0" }}>
                    Pick the shape and I&apos;ll design your app in it —
                    a real first pass, working. The download at the end
                    matches what you see here.
                  </p>
                  {factorProblem !== "" && (
                    <p
                      className="small"
                      style={{ margin: "8px 0 0", color: "var(--red)" }}
                    >
                      {factorProblem}
                    </p>
                  )}
                  <div
                    style={{ display: "flex", gap: 8, marginTop: 12 }}
                    role="group"
                    aria-label="App shape"
                  >
                    {(["mobile", "desktop"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        className="btn btn-primary"
                        disabled={factorBusy}
                        onClick={() => void pickFactor(f)}
                      >
                        {f === "mobile" ? "📱 Mobile" : "🖥️ Desktop"}
                      </button>
                    ))}
                  </div>
                </div>
              ) : hasFiles ? (
                <>
                  <div className="card" style={{ padding: 16 }}>
                    <div
                      className={
                        formFactor === "desktop"
                          ? "device-desktop"
                          : "device-mobile"
                      }
                      style={{ pointerEvents: "none" }}
                    >
                      <iframe
                        title={`${project.name} design preview`}
                        sandbox="allow-scripts"
                        srcDoc={previewDoc}
                        style={{
                          width: "100%",
                          height: formFactor === "desktop" ? 560 : 620,
                          border: "none",
                          borderRadius: 8,
                          background: "#fff",
                        }}
                      />
                    </div>
                  </div>
                  <p className="small" style={{ margin: 0 }}>
                    {`Blueprint · draft ${drafts.length} — designed from your words in ${formFactor ?? "mobile"} shape. Look it over, then walk it to Prototype to tap through it. `}
                    <button
                      type="button"
                      disabled={factorBusy}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "var(--red)",
                        textDecoration: "underline",
                        cursor: "pointer",
                        font: "inherit",
                      }}
                      onClick={() =>
                        void pickFactor(
                          formFactor === "desktop" ? "mobile" : "desktop",
                        )
                      }
                    >
                      Redesign for{" "}
                      {formFactor === "desktop" ? "mobile" : "desktop"}
                    </button>
                  </p>
                </>
              ) : legacySpec ? (
                <>
                  <div className="card" style={{ padding: 16 }}>
                    <span
                      style={{ display: "contents" }}
                      dangerouslySetInnerHTML={{
                        __html: renderSpecWireframe(
                          wireScreens ?? [],
                          formFactor ?? "mobile",
                        ),
                      }}
                    />
                  </div>
                  <p className="small" style={{ margin: 0 }}>
                    {`Sketch · draft ${drafts.length} — drawn from your spec in ${formFactor ?? "mobile"} shape. `}
                    <button
                      type="button"
                      disabled={factorBusy}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "var(--red)",
                        textDecoration: "underline",
                        cursor: "pointer",
                        font: "inherit",
                      }}
                      onClick={() =>
                        void pickFactor(
                          formFactor === "desktop" ? "mobile" : "desktop",
                        )
                      }
                    >
                      Switch to {formFactor === "desktop" ? "mobile" : "desktop"}
                    </button>
                  </p>
                </>
              ) : (
                <div className="card" style={{ padding: 20 }}>
                  <p className="hand" style={{ fontSize: 24, margin: 0 }}>
                    The design didn&apos;t land.
                  </p>
                  <p className="small" style={{ margin: "8px 0 0" }}>
                    {factorProblem !== ""
                      ? factorProblem
                      : "Something went wrong while designing. Try again — your shape is saved."}
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={factorBusy}
                      onClick={() =>
                        void pickFactor(formFactor ?? "mobile")
                      }
                    >
                      Design it again
                    </button>
                  </div>
                </div>
              )
            ) : null
          ) : (
          <>
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
          </>
          )}
        </div>
        <div className="railcol">
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
          {specSketch && (
            <div className="card" style={{ padding: "12px 14px" }}>
              <p className="small" style={{ margin: 0 }}>
                <strong>How this works.</strong> The Blueprint is a still
                look — not clickable. The Prototype taps through so you can
                feel it. The Download is yours to wire up: backend,
                hosting, whatever&apos;s next.
              </p>
            </div>
          )}
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
        </div>
      </section>

      {si === 2 && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="h2">Your pack</h2>
          <p className="small" style={{ marginTop: 4 }}>
            {specSketch
              ? "Your decisions record below — and your code, generated from the same design."
              : "The design turned into files. They go out with the send-off — or download them now."}
          </p>
          <PackFileList files={packFiles} />
          {specSketch && (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSending(true)}
              >
                <BIcon svg={B.icon("download")} /> Generate my code (.zip)
              </button>
            </div>
          )}
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
                    dangerouslySetInnerHTML={{
                      __html:
                        specSketch && !formFactor
                          ? ""
                          : specSketch
                            ? renderSpecWireframe(
                                wireScreens ?? [],
                                formFactor ?? "mobile",
                              )
                            : thumbs[i].svg,
                    }}
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
          stageLabel={stepLabel(
            labels,
            project.medium,
            B.STAGES.indexOf(project.stage),
          )}
          notes={notes.map((n) => ({
            who: n.who,
            part: n.part,
            topic: n.topic,
            text: n.text,
          }))}
          drafts={drafts}
          formFactor={formFactor}
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
          arrivedLabel={medium.arrivedLabel}
        />
      )}
      {fullView && hasFiles && (
        <Dialog
          labelledBy="fullview-title"
          onClose={() => setFullView(false)}
          wide
        >
          <h2 id="fullview-title" className="h2" style={{ marginTop: 0 }}>
            {project.name}
          </h2>
          <p className="small" style={{ marginTop: 0 }}>
            First pass, working — isolated preview, your Bottega data
            stays untouched.
          </p>
          <iframe
            title={`${project.name} fullscreen prototype`}
            sandbox="allow-scripts"
            srcDoc={previewDoc}
            style={{
              width: "100%",
              height: "70vh",
              border: "1px solid var(--line)",
              borderRadius: 8,
              background: "#fff",
            }}
          />
          <div className="dialog-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setFullView(false)}
            >
              Back to the board
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

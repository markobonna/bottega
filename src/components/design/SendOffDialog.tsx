"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  addProjectNote,
  markFinished,
  markInstalled,
  recordRfqSent,
} from "@/app/projects/[id]/actions";
import type { DesignMedium } from "@/lib/design/project-art";
import { brief, pack, scad, slug, stl } from "@/lib/design/cad";
import { fabReadme, strBytes, zipStore } from "@/lib/design/fabpack";
import { REAL_MAKERS } from "@/lib/design/makers";
import { toolsFor } from "@/lib/design/tools";

import "@/vendor/bottega/core.js";
import "@/vendor/bottega/types.js";
import "@/vendor/bottega/art/common.js";
import "@/vendor/bottega/art/room.js";
import "@/vendor/bottega/art/board.js";
import ConciergeCard from "./ConciergeCard";
import Dialog, { BIcon } from "./Dialog";
import PhotoCapture from "./PhotoCapture";

interface Vendor {
  id: string;
  name: string;
  does: string;
  contact: string;
  address: string;
  hint?: string;
  real?: boolean;
}

const CRATE_SVG = `<svg width="44" height="40" viewBox="0 0 44 40" aria-hidden="true"><path d="M4 14 L22 6 L40 14 V34 L22 39 L4 34 Z" fill="#D9B47A" stroke="#33261A" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 14 L22 20 L40 14 M22 20 V39" fill="none" stroke="#33261A" stroke-width="1.6"/></svg>`;

const PACKS: Record<string, { file: string; label: string; what: string }> = {
  music: {
    file: "song-pack.md",
    label: "Song pack",
    what: "Lyrics, chords and notes — ready to play or share",
  },
  dance: {
    file: "rehearsal-pack.md",
    label: "Rehearsal pack",
    what: "Counts, formations and music notes — ready to rehearse",
  },
  recipe: {
    file: "recipe-card.md",
    label: "Recipe card",
    what: "Ingredients, steps and cost — ready for the kitchen",
  },
};

const EXPORT_DONE: Record<string, string> = {
  music: "Go play it — and add a photo when you do.",
  dance: "Break a leg — and add a photo after the show.",
  recipe: "Serve the first plate — and add a photo of it.",
};

export default function SendOffDialog({
  onClose,
  appId,
  project,
  workshopName,
  stageLabel,
  notes,
  drafts,
}: {
  onClose: () => void;
  appId: string;
  project: { name: string; medium: DesignMedium; tagline: string };
  workshopName: string;
  stageLabel: string;
  notes: { who: string; part: number | null; topic: string | null; text: string }[];
  drafts: { n: number; label: string; stage: string }[];
}) {
  const B = window.B;
  const router = useRouter();
  const medium = B.MEDIUMS[project.medium] ?? B.MEDIUMS.hardware;
  const tools = toolsFor(project.medium, medium.tools);
  const flow: string = medium.flow;
  const stepNames =
    flow === "quote"
      ? ["Files", "Find makers", "Message", "Send"]
      : flow === "ship"
        ? ["Build", "Install"]
        : ["Files"];

  const [step, setStep] = useState(0);
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [msgTouched, setMsgTouched] = useState(false);
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [target, setTarget] = useState("tablet");
  const [started, setStarted] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [built, setBuilt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [done, setDone] = useState<
    "installed" | "finished" | "rfqs-out" | "concierge" | null
  >(null);
  const [addName, setAddName] = useState("");
  const [addAddr, setAddAddr] = useState("");
  const [showSourcing, setShowSourcing] = useState(false);
  const [concierge, setConcierge] = useState<{
    email: string;
    replyBy: string;
  } | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const files = useMemo(() => {
    const s = slug(project.name);
    type Entry = {
      name: string;
      what: string;
      mime?: string;
      make: () => string | Uint8Array;
    };
    const list: Entry[] = [];
    const briefText = () =>
      brief({
        name: project.name,
        workshopName,
        kindLabel: medium.label,
        stageLabel,
        tagline: project.tagline,
        notes,
        drafts,
        topics: tools,
      });
    const conceptSvg = () =>
      B.art
        .board(
          { name: project.name, medium: project.medium, stage: "build" },
          "render",
          { thumb: true },
        )
        .svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
    if (project.medium === "hardware") {
      list.push({
        name: `${s}.scad`,
        what: "Parametric CAD model — opens in OpenSCAD (free), exports STL",
        make: () => scad(project.name),
      });
      list.push({
        name: `${s}-envelope.stl`,
        what: "STL of the outer envelope — for a quick 3D-print size check",
        make: () => stl(project.name),
      });
    }
    if (["print", "space", "music", "dance"].includes(project.medium)) {
      list.push({
        name: `${s}.svg`,
        what:
          project.medium === "print"
            ? "Print-ready artwork (SVG)"
            : "Drawing (SVG)",
        make: conceptSvg,
      });
    }
    list.push({
      name: `${s}-brief.md`,
      what: "Project brief — every decision and note, for whoever builds it",
      make: briefText,
    });
    if (flow === "quote") {
      list.push({
        name: `${s}-fab-pack.zip`,
        what: "RFQ pack — everything a real shop needs, in one zip",
        mime: "application/zip",
        make: () => {
          const inner = [
            {
              name: `${s}-brief.md`,
              what: "Requirements and decisions",
              text: briefText(),
            },
            {
              name: `${s}-concept.svg`,
              what: "Concept drawing (not dimensioned)",
              text: conceptSvg(),
            },
            ...(project.medium === "hardware"
              ? [
                  {
                    name: `${s}.scad`,
                    what: "Parametric CAD — opens in OpenSCAD (free)",
                    text: scad(project.name),
                  },
                  {
                    name: `${s}-envelope.stl`,
                    what: "Envelope for size-check only",
                    text: stl(project.name),
                  },
                ]
              : []),
          ];
          return zipStore([
            {
              name: "README.txt",
              data: strBytes(
                fabReadme({
                  name: project.name,
                  workshopName,
                  kindLabel: medium.label,
                  files: inner,
                }),
              ),
            },
            ...inner.map((f) => ({ name: f.name, data: strBytes(f.text) })),
          ]);
        },
      });
    }
    const pkg = PACKS[project.medium];
    if (pkg) {
      list.push({
        name: `${s}-${pkg.file}`,
        what: pkg.what,
        make: () =>
          pack({
            name: project.name,
            packLabel: pkg.label,
            notes,
            topics: tools,
          }),
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  // Makers appear after a beat, like a search.
  useEffect(() => {
    if (flow !== "quote" || vendors) return;
    const found: Vendor[] = (REAL_MAKERS[project.medium] ?? []).map(
      (m, i) => ({
        id: `real${i}`,
        name: m.name,
        does: m.does,
        contact: m.contact,
        address: m.address,
        hint: m.hint,
        real: true,
      }),
    );
    setVendors(found);
    const sel: Record<string, boolean> = {};
    found.forEach((v) => {
      sel[v.id] = true;
    });
    setSelected(sel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow]);

  // Simulated software build log.
  function runBuild() {
    setStarted(true);
    const link = `${window.location.origin}/apps/${appId}`;
    const lines = [
      `$ bottega build "${project.name}" --for ${target}`,
      "✓ Writing screens from the drawing",
      "✓ Setting up data (stored on your device)",
      "✓ Running 24 checks — all passed",
      "✓ Packaging as an installable web app",
      `✓ Ready: ${link}`,
    ];
    lines.forEach((ln, i) => {
      const t = window.setTimeout(
        () => {
          setLog((l) => [...l, ln]);
          if (i === lines.length - 1) setBuilt(true);
        },
        500 + i * 650,
      );
      timers.current.push(t);
    });
  }

  function installSteps(): string[] {
    const link = `${window.location.origin}/apps/${appId}`;
    return (
      {
        tablet: [
          `On the tablet, open ${link} in Safari or Chrome.`,
          "Tap Share (iPad) or the ⋮ menu (Android), then “Add to Home Screen”.",
          "Open it from the new icon. It runs full screen and works offline.",
          "Optional: turn on Guided Access (iPad) or Screen Pinning (Android) so customers can't leave the app.",
        ],
        phone: [
          `Open ${link} on your phone.`,
          "Tap Share → “Add to Home Screen” (iPhone) or ⋮ → “Install app” (Android).",
          "Open it from your home screen.",
        ],
        computer: [
          `Open ${link} in Chrome or Edge.`,
          "Click the install icon at the right of the address bar.",
          "It now opens like a normal program from your Start menu or Dock.",
        ],
        web: [
          `It's live at ${link}.`,
          "Share that link, or put it on your website and social profiles.",
          "To use your own domain, add it in Settings → Domain.",
        ],
      }[target] ?? []
    );
  }

  const initialMessage = useMemo(() => {
    const mine = notes
      .filter((n) => n.who === "you" && n.text !== project.tagline)
      .slice(-8);
    const blocks = mine
      .filter((n) => !n.topic)
      .map((n) => `- ${n.text}`);
    for (const [id, label] of tools) {
      const group = mine.filter((n) => n.topic === id);
      if (group.length > 0) {
        blocks.push(`${label}:\n${group.map((n) => `- ${n.text}`).join("\n")}`);
      }
    }
    const decided = blocks.join("\n");
    const packName = `${slug(project.name)}-fab-pack.zip`;
    return `Hello,

I'm an AI assistant writing on behalf of [YOUR NAME] at ${workshopName}. We're looking for a quote to make the following:

${project.name}${project.tagline ? " — " + project.tagline : ""}
Quantity: 1.
${decided ? "\nKey requirements:\n" + decided + "\n" : ""}
Our RFQ pack (${packName}) is attached: CAD, drawings, and a full brief. Could you reply with a price, lead time, and a payment link, plus anything you'd change to make it easier or cheaper to build?

Thank you,
[YOUR NAME] (sent by their assistant — replies go straight to them)`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  function mailtoFor(v: Vendor): string {
    const packName = `${slug(project.name)}-fab-pack.zip`;
    const body =
      `Hello,\n\nI'm [YOUR NAME] at ${workshopName}. ` +
      `Please quote the attached RFQ pack (${packName}): ${project.name}. ` +
      `Full requirements are in the pack's brief.\n\n` +
      `Please reply with a price, lead time, and a payment link.\n\nThank you,\n[YOUR NAME]`;
    return `mailto:${v.address}?subject=${encodeURIComponent(`Request for quote: ${project.name}`)}&body=${encodeURIComponent(body)}`;
  }

  function webUrl(v: Vendor): string {
    return v.address.startsWith("http") ? v.address : `https://${v.address}`;
  }

  async function sentOut(chosen: Vendor[]) {
    if (!chosen.length || busy) return;
    setBusy(true);
    setProblem("");
    const res = await recordRfqSent(
      appId,
      chosen.map((v) => ({
        name: v.name,
        contact: v.contact,
        address: v.address,
      })),
    );
    if (!res.ok) {
      setBusy(false);
      setProblem("Couldn't save that. Try again.");
      return;
    }
    await addProjectNote(appId, {
      who: "apprentice",
      text: `RFQs went out to ${chosen.map((v) => v.name).join(", ")}. When they reply, tell me what they promised and I'll count it down.`,
    });
    setBusy(false);
    setDone("rfqs-out");
    router.refresh();
  }

  async function installed() {
    setBusy(true);
    const res = await markInstalled(appId, target);
    setBusy(false);
    if (!res.ok) {
      setProblem("Couldn't save that. Try again.");
      return;
    }
    setDone("installed");
    router.refresh();
  }

  async function finish() {
    setBusy(true);
    const res = await markFinished(appId);
    setBusy(false);
    if (!res.ok) {
      setProblem("Couldn't save that. Try again.");
      return;
    }
    setDone("finished");
    router.refresh();
  }

  function addVendor() {
    const name = addName.trim();
    const addr = addAddr.trim();
    if (!name || !addr || !vendors) return;
    const v: Vendor = {
      id: `v${Date.now()}`,
      name,
      does: "Added by you",
      contact: /@/.test(addr)
        ? "email"
        : /^[\d+()\s-]+$/.test(addr)
          ? "phone"
          : "web",
      address: addr,
    };
    setVendors([...vendors, v]);
    setSelected((s) => ({ ...s, [v.id]: true }));
    setAddName("");
    setAddAddr("");
  }

  const contactIcon = (c: string) =>
    c === "phone" ? "phone" : c === "email" ? "mail" : "globe";

function downloadFile(name: string, data: string | Uint8Array, mime?: string) {
  if (typeof data === "string") {
    window.B.download(name, data, mime);
    return;
  }
  const blob = new Blob([data as unknown as BlobPart], {
    type: mime ?? "application/octet-stream",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 800);
}

  function fileList() {
    return (
      <ul className="filelist">
        {files.map((f, i) => (
          <li key={f.name}>
            <BIcon svg={B.icon("download", 20)} />
            <div className="grow">
              <strong>{f.name}</strong>
              <div className="small">{f.what}</div>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => downloadFile(f.name, files[i].make(), f.mime)}
            >
              Download
            </button>
          </li>
        ))}
      </ul>
    );
  }

  function quoteBody(): ReactNode {
    const packEntry = files.find((f) => f.name.endsWith("-fab-pack.zip"));
    if (done === "rfqs-out") {
      const names = (vendors ?? [])
        .filter((v) => selected[v.id])
        .map((v) => v.name)
        .join(", ");
      return (
        <>
          <p className="hand" style={{ fontSize: 26, margin: 0, lineHeight: 1.2 }}>
            RFQs are out{names ? ` to ${names}` : ""}.
          </p>
          <p style={{ margin: 0 }}>
            They&apos;ll reply with payment details. Have your credit card
            ready — nothing is ordered until you pay their reply. When they
            answer, tell me what they promised and I&apos;ll count it down.
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </>
      );
    }
    if (done === "concierge" && concierge) {
      const by = new Date(concierge.replyBy);
      return (
        <>
          <p className="hand" style={{ fontSize: 26, margin: 0, lineHeight: 1.2 }}>
            Sourcing requested.
          </p>
          <p style={{ margin: 0 }}>
            We&apos;ll reply to {concierge.email} by{" "}
            {Number.isNaN(by.getTime())
              ? "within 48 hours"
              : by.toLocaleString()}{" "}
            with a supplier — or to say we couldn&apos;t find one.
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </>
      );
    }
    if (step === 0) {
      return (
        <>
          <p style={{ margin: 0 }}>
            I turned the drawing into files a maker can work from.{" "}
            {project.medium === "hardware"
              ? "The CAD model is parametric — change a number at the top and it regenerates."
              : ""}
          </p>
          {fileList()}
          <div className="dialog-actions">
            <button type="button" className="btn" onClick={onClose}>
              Not yet
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep(1)}
            >
              Find makers <BIcon svg={B.icon("fwd")} />
            </button>
          </div>
        </>
      );
    }
    if (step === 1) {
      if (!vendors) return null;
      const any = Object.values(selected).some(Boolean);
      const showConcierge = vendors.length === 0 || showSourcing;
      return (
        <>
          <p style={{ margin: 0 }}>
            {vendors.length > 0
              ? "These shops take this kind of work. Pick who should get the request, or add someone you already know."
              : `Nothing in the database for this kind of ${medium.thing} yet — add a shop you know, or ask us to source one.`}
          </p>
          {vendors.length > 0 && (
            <p className="sim">
              Named shops take real orders — you send the RFQ pack yourself
              in the last step.
            </p>
          )}
          <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
            <legend className="sr-only">Who to ask</legend>
            <ul className="vendors">
              {vendors.map((v) => (
                <li key={v.id}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={!!selected[v.id]}
                      onChange={(e) =>
                        setSelected((s) => ({ ...s, [v.id]: e.target.checked }))
                      }
                    />
                    <span>
                      <BIcon svg={B.icon(contactIcon(v.contact), 18)} />
                    </span>
                    <span>
                      <strong>{v.name}</strong>
                      <br />
                      <span className="small">
                        {v.does} · by{" "}
                        {v.contact === "web" ? "web form" : v.contact} ·{" "}
                        {v.address}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <form
            style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}
            onSubmit={(e) => {
              e.preventDefault();
              addVendor();
            }}
          >
            <div style={{ flex: "2 1 180px" }}>
              <label className="lbl" htmlFor="so-name">
                Add a maker you know
              </label>
              <input
                id="so-name"
                type="text"
                placeholder="Name of the shop or person"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>
            <div style={{ flex: "1 1 140px" }}>
              <label className="lbl" htmlFor="so-addr">
                Email or phone
              </label>
              <input
                id="so-addr"
                type="text"
                placeholder="name@shop.com or number"
                value={addAddr}
                onChange={(e) => setAddAddr(e.target.value)}
              />
            </div>
            <button className="btn" type="submit">
              <BIcon svg={B.icon("plus")} /> Add
            </button>
          </form>
          {showConcierge &&
            (concierge ? (
              <p className="sim">
                Sourcing requested — we&apos;ll reply to {concierge.email}.
              </p>
            ) : (
              <ConciergeCard
                appId={appId}
                idPrefix="so-src"
                headline="Sourcing requested"
                blurb="No supplier in our database for this yet. Send this request and Bottega will source one and reply within 48 hours."
                actionLabel="Request sourcing"
                mailSubject={`Sourcing request: ${project.name}`}
                mailContext={`Project: ${project.name}\nKind: ${medium.label}\nWorkshop: ${workshopName}`}
                onDone={(d) => setConcierge(d)}
              />
            ))}
          {!showConcierge && (
            <div>
              <button
                type="button"
                className="btn"
                onClick={() => setShowSourcing(true)}
              >
                My process isn&apos;t listed
              </button>
            </div>
          )}
          <div className="dialog-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setStep(0)}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!any && !concierge}
              onClick={() => (any ? setStep(2) : setDone("concierge"))}
            >
              {any ? (
                <>
                  Draft the message <BIcon svg={B.icon("fwd")} />
                </>
              ) : (
                "Done"
              )}
            </button>
          </div>
        </>
      );
    }
    if (step === 2) {
      const phones = (vendors ?? []).filter(
        (v) => selected[v.id] && v.contact === "phone",
      );
      return (
        <>
          <p style={{ margin: 0 }}>
            Here&apos;s the full request — for web forms, paste it in. Email
            vendors get a short version plus the pack. Edit anything; nothing
            goes out until you send it yourself.
          </p>
          <label className="lbl" htmlFor="so-msg">
            Email and web-form message
          </label>
          <textarea
            id="so-msg"
            rows={12}
            value={msgTouched ? message : initialMessage}
            onChange={(e) => {
              setMsgTouched(true);
              setMessage(e.target.value);
            }}
          />
          {phones.length > 0 && (
            <div className="sim">
              <strong>Phone script</strong> for{" "}
              {phones.map((v) => v.name).join(", ")}: “Hi, this is an AI
              assistant calling for [YOUR NAME] at {workshopName}. I&apos;d
              like a quote for {project.name} — may I email you the drawings?”
              I always say I&apos;m an AI, and I don&apos;t agree to prices or
              orders on calls.
            </div>
          )}
          <p className="small" style={{ margin: 0 }}>
            Replace [YOUR NAME] before approving. Quotes come back to you to
            decide.
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep(3)}
            >
              Continue to sending <BIcon svg={B.icon("fwd")} />
            </button>
          </div>
        </>
      );
    }
    if (step === 3) {
      const chosen = (vendors ?? []).filter((v) => selected[v.id]);
      const allMarked =
        chosen.length > 0 && chosen.every((v) => marked[v.id]);
      const sendPack = (v: Vendor) => {
        if (packEntry) {
          downloadFile(packEntry.name, packEntry.make(), packEntry.mime);
        }
        if (v.contact === "email") {
          window.location.href = mailtoFor(v);
        } else if (v.contact === "web") {
          window.open(webUrl(v), "_blank", "noreferrer");
        }
      };
      return (
        <>
          <p style={{ margin: 0 }}>
            Two taps per shop: take the pack, then send it. Mark each one as
            you go — I can&apos;t see your outbox, so this runs on trust.
          </p>
          <ul className="reach">
            {chosen.map((v) => (
              <li key={v.id}>
                <BIcon svg={B.icon(contactIcon(v.contact), 20)} />
                <div className="grow">
                  <strong>{v.name}</strong>
                  <div className="small">
                    {v.contact === "phone"
                      ? `Call ${v.address} with the script from the last step.`
                      : (v.hint ?? "Send them the RFQ pack.")}
                  </div>
                </div>
                {v.contact !== "phone" && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => sendPack(v)}
                  >
                    <BIcon svg={B.icon("download", 18)} />{" "}
                    {v.contact === "email" ? "Pack + email" : "Pack + site"}
                  </button>
                )}
                <label className="check">
                  <input
                    type="checkbox"
                    checked={!!marked[v.id]}
                    onChange={(e) =>
                      setMarked((m) => ({ ...m, [v.id]: e.target.checked }))
                    }
                  />
                  <span className="small">Sent</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="small" style={{ margin: 0 }}>
            Email can&apos;t carry attachments by itself — attach the
            downloaded pack before you hit send. Replace [YOUR NAME] first.
          </p>
          {problem !== "" && (
            <p className="small" style={{ margin: 0, color: "var(--red)" }}>
              {problem}
            </p>
          )}
          <div className="dialog-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setStep(2)}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!allMarked || busy}
              onClick={() => void sentOut(chosen)}
            >
              <BIcon svg={B.icon("check")} />{" "}
              {busy ? "Saving…" : "RFQs are out"}
            </button>
          </div>
        </>
      );
    }
    return null;
  }

  function shipBody(): ReactNode {
    if (done === "installed") {
      const link = `${window.location.origin}/apps/${appId}`;
      return (
        <>
          <p className="hand" style={{ fontSize: 26, margin: 0, lineHeight: 1.2 }}>
            {target === "web"
              ? `It's live at ${link}.`
              : "It's installed."}
          </p>
          {target !== "web" && (
            <p style={{ margin: 0 }}>
              Open it any time at {link}.
            </p>
          )}
          <div className="dialog-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </>
      );
    }
    if (!started) {
      const targets = [
        ["tablet", "Tablet"],
        ["phone", "Phone"],
        ["computer", "Computer"],
        ["web", "Website"],
      ];
      return (
        <>
          <p style={{ margin: 0 }}>
            Where should {project.name} run? I&apos;ll build it for that and
            give you the install steps.
          </p>
          <div className="chips" role="group" aria-label="Where it runs">
            {targets.map(([id, l]) => (
              <button
                key={id}
                type="button"
                className="chip"
                aria-pressed={target === id}
                onClick={() => setTarget(id)}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn" onClick={onClose}>
              Not yet
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={runBuild}
            >
              <BIcon svg={B.icon("play")} /> Build it
            </button>
          </div>
        </>
      );
    }
    if (step === 0) {
      return (
        <>
          <div className="log" aria-live="polite">
            {log.join("\n")}
          </div>
          <p className="sim">
            Simulated build. A real build checks the spec and packages the
            app for the device.
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!built}
              onClick={() => setStep(1)}
            >
              Install it <BIcon svg={B.icon("fwd")} />
            </button>
          </div>
        </>
      );
    }
    return (
      <>
        <div className="install">
          <p style={{ margin: "0 0 10px" }}>
            It&apos;s built. Here&apos;s how to put it on your{" "}
            {target === "web" ? "website" : target}:
          </p>
          <ol>
            {installSteps().map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
        </div>
        {problem !== "" && (
          <p className="small" style={{ margin: 0, color: "var(--red)" }}>
            {problem}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="btn"
            onClick={() =>
              B.download(
                `${slug(project.name)}-install.md`,
                `# Installing ${project.name}\n\n` +
                  installSteps()
                    .map((x, i) => `${i + 1}. ${x}`)
                    .join("\n") +
                  "\n",
              )
            }
          >
            <BIcon svg={B.icon("download")} /> Save these steps
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void installed()}
          >
            <BIcon svg={B.icon("check")} />{" "}
            {busy ? "Saving…" : "I've installed it"}
          </button>
        </div>
      </>
    );
  }

  function exportBody(): ReactNode {
    if (done === "finished") {
      return (
        <>
          <p className="hand" style={{ fontSize: 26, margin: 0, lineHeight: 1.2 }}>
            {medium.arrivedLabel}.{" "}
            {EXPORT_DONE[project.medium] ?? "It's out in the world."}
          </p>
          <PhotoCapture
            appId={appId}
            id="so-photo"
            label="Prove it — add a photo"
          />
          <div className="dialog-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </>
      );
    }
    const pkg = PACKS[project.medium];
    return (
      <>
        <p style={{ margin: 0 }}>
          {pkg
            ? `Here's your ${pkg.label.toLowerCase()} and the brief — ready to share.`
            : "Here's everything, ready to share."}
        </p>
        {fileList()}
        {problem !== "" && (
          <p className="small" style={{ margin: 0, color: "var(--red)" }}>
            {problem}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            Not yet
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void finish()}
          >
            <BIcon svg={B.icon("check")} />{" "}
            {busy ? "Saving…" : `Mark as ${medium.arrivedLabel.toLowerCase()}`}
          </button>
        </div>
      </>
    );
  }

  return (
    <Dialog labelledBy="dlg-title" onClose={onClose} wide>
      <div className="dialog-head">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BIcon svg={CRATE_SVG} />
          <h2 id="dlg-title">
            {flow === "ship" ? "Build and install" : "Send it off"}
          </h2>
        </div>
        <button
          type="button"
          className="icon-btn ghost"
          onClick={onClose}
          aria-label="Close"
        >
          <BIcon svg={B.icon("close", 20)} />
        </button>
      </div>
      <p className="small" style={{ margin: 0 }}>
        {project.name} · {workshopName}
      </p>
      <ol className="steps" aria-label="Steps">
        {stepNames.map((n, i) => (
          <li
            key={n}
            className={i < step ? "done" : i === step ? "on" : ""}
            aria-current={i === step ? "step" : undefined}
          >
            {i + 1}. {n}
          </li>
        ))}
      </ol>
      {flow === "quote"
        ? quoteBody()
        : flow === "ship"
          ? shipBody()
          : exportBody()}
    </Dialog>
  );
}

"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  addProjectNote,
  getBuildFiles,
  getExportMeta,
  markFinished,
  markDownloaded,
  recordRfqSent,
  type ExportMeta,
} from "@/app/projects/[id]/actions";
import type { DesignMedium } from "@/lib/design/project-art";
import { slug } from "@/lib/design/cad";
import { strBytes, zipStore } from "@/lib/design/fabpack";
import {
  buildPackFiles,
  downloadPackFile,
  packLabelFor,
} from "@/lib/design/pack-files";
import { REAL_MAKERS } from "@/lib/design/makers";
import { toolsFor, topicLabel } from "@/lib/design/tools";

import "@/vendor/bottega/core.js";
import "@/vendor/bottega/types.js";
import "@/vendor/bottega/art/common.js";
import "@/vendor/bottega/art/room.js";
import "@/vendor/bottega/art/board.js";
import ConciergeCard from "./ConciergeCard";
import Dialog, { BIcon } from "./Dialog";
import PackFileList from "./PackFileList";
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
  formFactor,
}: {
  onClose: () => void;
  appId: string;
  project: { name: string; medium: DesignMedium; tagline: string };
  workshopName: string;
  stageLabel: string;
  notes: { who: string; part: number | null; topic: string | null; text: string }[];
  drafts: { n: number; label: string; stage: string }[];
  formFactor: "mobile" | "desktop" | null;
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
        ? ["Download"]
        : ["Files"];

  const [step, setStep] = useState(0);
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [msgTouched, setMsgTouched] = useState(false);
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [started, setStarted] = useState(false);
  const [meta, setMeta] = useState<ExportMeta | null>(null);
  // First-pass code: the shape was picked at Sketch; legacy blanks pick here.
  const [cgPick, setCgPick] = useState<"mobile" | "desktop">("mobile");
  const factor = formFactor ?? cgPick;
  const [cgBusy, setCgBusy] = useState(false);
  const [cgSecs, setCgSecs] = useState(0);
  const [cgFiles, setCgFiles] = useState<
    { path: string; content: string }[] | null
  >(null);
  const [cgProblem, setCgProblem] = useState("");
  const [cgVia, setCgVia] = useState("meta");
  // Spark-built apps ship their designed files; legacy spec apps
  // generate code from the spec in this dialog instead.
  const [storedView, setStoredView] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [done, setDone] = useState<
    "downloaded" | "finished" | "rfqs-out" | "concierge" | null
  >(null);
  const [addName, setAddName] = useState("");
  const [addAddr, setAddAddr] = useState("");
  const [showSourcing, setShowSourcing] = useState(false);
  const [concierge, setConcierge] = useState<{
    email: string;
    replyBy: string;
  } | null>(null);


  const files = useMemo(
    () =>
      buildPackFiles({
        name: project.name,
        medium: project.medium,
        tagline: project.tagline,
        workshopName,
        stageLabel,
        notes,
        drafts,
        tools,
        flow,
        kindLabel: medium.label,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appId],
  );

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

  useEffect(() => {
    if (flow !== "ship") return;
    let live = true;
    void getBuildFiles(appId).then((res) => {
      if (!live || !res.ok || !res.files) return;
      setCgFiles(res.files);
      setStoredView(true);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, appId]);

  useEffect(() => {
    if (!cgBusy) return;
    const t0 = Date.now();
    setCgSecs(0);
    const t = window.setInterval(
      () => setCgSecs(Math.floor((Date.now() - t0) / 1000)),
      500,
    );
    return () => window.clearInterval(t);
  }, [cgBusy]);

  async function generateCode() {
    if (cgBusy) return;
    setCgBusy(true);
    setCgProblem("");
    setCgFiles(null);
    try {
      const res = await fetch("/api/codegen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appId, formFactor: factor }),
      });
      if (res.status === 503) {
        setCgProblem("Code generation is off right now (no model key).");
        return;
      }
      if (!res.ok) throw new Error("codegen failed");
      const data = (await res.json()) as {
        files: { path: string; content: string }[];
        via?: string;
      };
      setCgFiles(data.files);
      setCgVia(data.via ?? "meta");
    } catch {
      setCgProblem("Couldn't generate the code. Try again.");
    } finally {
      setCgBusy(false);
    }
  }

  // The margin notes ship with the code, so further development —
  // by the user or the team — starts from the same decisions.
  const notesTxt =
    notes.length === 0
      ? `Margin notes for ${project.name}\n\nNo margin notes on this project.`
      : `Margin notes for ${project.name}\n\n${notes
          .map(
            (n) =>
              `[${n.who === "you" ? "You" : "Apprentice"}${n.topic ? ` · ${topicLabel(tools, n.topic) ?? n.topic}` : ""}] ${n.text}`,
          )
          .join("\n\n")}`;

  // The download IS the finish line: the file left the browser, so the
  // project is honestly done the moment this fires.
  async function downloadCodeZip() {
    if (!cgFiles || busy) return;
    const bytes = zipStore(
      [...cgFiles, { path: "NOTES.txt", content: notesTxt }].map((f) => ({
        name: f.path,
        data: strBytes(f.content),
      })),
    );
    const blob = new Blob([bytes as unknown as BlobPart], {
      type: "application/zip",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(project.name)}-app-code.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    setBusy(true);
    const res = await markDownloaded(appId);
    setBusy(false);
    if (!res.ok) {
      setProblem("The file downloaded, but I couldn't stamp it done. Try again.");
      return;
    }
    setDone("downloaded");
    router.refresh();
  }

  // Real software download: the design is checked and counted server-side;
  // every line below reports a measured fact.
  async function runDownload() {
    if (busy) return;
    if (storedView) {
      setStarted(true);
      return;
    }
    setBusy(true);
    setProblem("");
    const res = await getExportMeta(appId);
    setBusy(false);
    if (!res.ok) {
      setProblem("Couldn't check the design. Try again.");
      return;
    }
    setMeta(res.meta);
    setStarted(true);
  }

  async function regenerateDesign() {
    if (cgBusy) return;
    setCgBusy(true);
    setCgProblem("");
    try {
      // A redesign rebuilds both phases in order: the look, then the
      // wiring plugged into that exact look.
      for (const phase of ["design", "prototype"] as const) {
        const res = await fetch("/api/software-design", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ appId, formFactor: factor, phase }),
        });
        if (res.status === 503) {
          setCgProblem("Designing is off right now (no model key).");
          return;
        }
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(err?.error || "design failed");
        }
        if (phase === "prototype") {
          const data = (await res.json()) as {
            files: { path: string; content: string }[];
            via?: string;
          };
          setCgFiles(data.files);
          setCgVia(data.via ?? "meta");
        }
      }
      router.refresh();
    } catch (e) {
      setCgProblem(
        e instanceof Error && e.message !== "design failed"
          ? e.message
          : "Couldn't redesign that. Try again.",
      );
    } finally {
      setCgBusy(false);
    }
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
          <PackFileList files={files} />
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
          downloadPackFile(packEntry);
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
    const liveLink = `${window.location.origin}/projects/${appId}`;
    if (done === "downloaded") {
      return (
        <>
          <p className="hand" style={{ fontSize: 26, margin: 0, lineHeight: 1.2 }}>
            Downloaded.
          </p>
          <p style={{ margin: 0 }}>
            {slug(project.name)}-app-code.zip is yours — unzip it,
            double-click index.html, and it runs. Send it, host it, keep
            building on it. Your live app stays here too: {liveLink}.
          </p>
          <div className="install" style={{ marginTop: 12 }}>
            <p style={{ margin: "0 0 10px" }}>
              <strong>Take it further.</strong> The file is yours to keep
              building on — or hand it to us: custom domain and hosting,
              team logins, more Meta blocks, scheduled automations.
            </p>
            <ConciergeCard
              appId={appId}
              idPrefix="ship-further"
              headline="Request sent"
              blurb="Tell us what to add and we'll reply within 48 hours."
              actionLabel="Ask the Bottega team"
              mailSubject={`Keep building: ${project.name}`}
              mailContext={`Project: ${project.name}\nKind: software\nWorkshop: ${workshopName}`}
            />
          </div>
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
      return (
        <>
          <p style={{ margin: 0 }}>
            I&apos;ll check the design and package your file — one zip,
            yours to keep.
          </p>
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
              onClick={() => void runDownload()}
            >
              <BIcon svg={B.icon("play")} /> {busy ? "Checking…" : "Download it"}
            </button>
          </div>
        </>
      );
    }
    if (step === 0 && started && storedView && cgFiles) {
      const withNotes = [...cgFiles, { path: "NOTES.txt", content: notesTxt }];
      const bytes = withNotes.reduce((n, f) => n + f.content.length, 0);
      const paths = withNotes.map((f) => f.path);
      const complete =
        paths.includes("index.html") &&
        paths.includes("styles.css") &&
        paths.includes("app.js") &&
        paths.includes("README.txt");
      return (
        <>
          <div className="log" aria-live="polite">
            {[
              `${project.name} — designed app in ${factor} shape`,
              complete
                ? "✓ Design checks passed"
                : "… prototype not built yet",
              `✓ ${cgFiles.map((f) => f.path).join(" · ")} (${Math.max(1, Math.round(bytes / 1024))} KB)`,
            ].join("\n")}
          </div>
          {problem !== "" && (
            <p className="small" style={{ margin: 0, color: "var(--red)" }}>
              {problem}
            </p>
          )}
          <div className="install" style={{ marginBottom: 12 }}>
            {complete ? (
              <p style={{ margin: "0 0 10px" }}>
                <strong>First pass, working.</strong> This is the app from
                your board, in {factor} shape — double-click index.html and
                it runs. Download it to keep adding features yourself, or
                ask the Bottega team to develop it further.
              </p>
            ) : (
              <p style={{ margin: "0 0 10px" }}>
                <strong>Not ready to download.</strong> The design is here
                but the prototype was never wired up — walk back to the
                Prototype step and let it build, then come back.
              </p>
            )}
            {cgBusy && (
              <p className="small" style={{ margin: "0 0 10px" }}>
                Redesigning… {cgSecs}s (usually a couple of minutes)
              </p>
            )}
            {cgProblem !== "" && (
              <p
                className="small"
                style={{ margin: "0 0 10px", color: "var(--red)" }}
              >
                {cgProblem}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn"
                disabled={cgBusy}
                onClick={() => void regenerateDesign()}
              >
                <BIcon svg={B.icon("play")} />{" "}
                {cgBusy ? "Redesigning…" : "Redesign"}
              </button>
              {complete && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void downloadCodeZip()}
                >
                  <BIcon svg={B.icon("download")} />{" "}
                  {busy ? "Finishing…" : "Download code (.zip)"}
                </button>
              )}
            </div>
            <p className="sim" style={{ marginBottom: 0 }}>
              Data saves in that browser. Voice, counting and pictures are
              marked where they belong — they run in Bottega.
            </p>
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      );
    }
    if (step === 0 && meta) {
      return (
        <>
          <div className="log" aria-live="polite">
            {[
              `${project.name} — spec v${meta.version}`,
              "✓ Design checks passed",
              `✓ ${meta.screens} screens · ${meta.blocks} blocks · ${meta.collections} collections · ${meta.records} records`,
            ].join("\n")}
          </div>
          {problem !== "" && (
            <p className="small" style={{ margin: 0, color: "var(--red)" }}>
              {problem}
            </p>
          )}
          <div className="install" style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 10px" }}>
              <strong>First-pass code.</strong> Real files generated from
              this design in {factor} shape — double-click index.html and
              it runs.
            </p>
            {!formFactor && (
              <div
                className="chips"
                role="group"
                aria-label="Code shape"
                style={{ marginBottom: 10 }}
              >
                {(["mobile", "desktop"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className="chip"
                    aria-pressed={cgPick === f}
                    onClick={() => setCgPick(f)}
                  >
                    {f === "mobile" ? "📱 Mobile" : "🖥️ Desktop"}
                  </button>
                ))}
              </div>
            )}
            {cgBusy && (
              <p className="small" style={{ margin: "0 0 10px" }}>
                Generating your first pass… {cgSecs}s (usually under a
                minute)
              </p>
            )}
            {cgFiles && (
              <p className="small" style={{ margin: "0 0 10px" }}>
                {cgFiles.map((f) => f.path).join(" · ")}
                {cgVia === "open" ? " — written with Muse Spark Open" : ""}
              </p>
            )}
            {cgProblem !== "" && (
              <p
                className="small"
                style={{ margin: "0 0 10px", color: "var(--red)" }}
              >
                {cgProblem}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn"
                disabled={cgBusy}
                onClick={() => void generateCode()}
              >
                <BIcon svg={B.icon("play")} />{" "}
                {cgBusy
                  ? "Generating…"
                  : cgFiles
                    ? "Regenerate"
                    : "Generate my code"}
              </button>
              {cgFiles && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void downloadCodeZip()}
                >
                  <BIcon svg={B.icon("download")} />{" "}
                  {busy ? "Finishing…" : "Download code (.zip)"}
                </button>
              )}
            </div>
            <p className="sim" style={{ marginBottom: 0 }}>
              Data saves in that browser. Voice, counting and pictures are
              marked where they belong — they run in Bottega.
            </p>
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      );
    }
    // Unreachable for ship: the flow is checks → download → done.
    return null;
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
    const pkgLabel = packLabelFor(project.medium);
    return (
      <>
        <p style={{ margin: 0 }}>
          {pkgLabel
            ? `Here's your ${pkgLabel.toLowerCase()} and the brief — ready to share.`
            : "Here's everything, ready to share."}
        </p>
        <PackFileList files={files} />
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
            {flow === "ship" ? "Download" : "Send it off"}
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

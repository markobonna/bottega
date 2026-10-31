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
  placeOrder,
} from "@/app/projects/[id]/actions";
import type { DesignMedium } from "@/lib/design/project-art";
import { brief, scad, slug, stl } from "@/lib/design/cad";
import { toolsFor } from "@/lib/design/tools";

import "@/vendor/bottega/core.js";
import "@/vendor/bottega/types.js";
import "@/vendor/bottega/art/common.js";
import "@/vendor/bottega/art/room.js";
import "@/vendor/bottega/art/board.js";
import Dialog, { BIcon } from "./Dialog";

interface Vendor {
  id: string;
  name: string;
  does: string;
  contact: string;
  address: string;
}

interface Quote {
  id: string;
  vendor: string;
  price: number;
  lead: number;
  note: string;
}

const QUOTE_NOTES = [
  "Can do it as drawn.",
  "Suggests a cheaper sheet-metal body.",
  "Off-the-shelf parts only; you assemble.",
  "Rush available for +25%.",
];

const CRATE_SVG = `<svg width="44" height="40" viewBox="0 0 44 40" aria-hidden="true"><path d="M4 14 L22 6 L40 14 V34 L22 39 L4 34 Z" fill="#D9B47A" stroke="#33261A" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 14 L22 20 L40 14 M22 20 V39" fill="none" stroke="#33261A" stroke-width="1.6"/></svg>`;

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
      ? ["Files", "Find makers", "Approve", "Reach out", "Quotes"]
      : flow === "ship"
        ? ["Build", "Install"]
        : ["Files"];

  const [step, setStep] = useState(0);
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [searching, setSearching] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [msgTouched, setMsgTouched] = useState(false);
  const [reach, setReach] = useState<Record<string, number>>({});
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [target, setTarget] = useState("tablet");
  const [started, setStarted] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [built, setBuilt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [done, setDone] = useState<Quote | "installed" | "finished" | null>(
    null,
  );
  const [addName, setAddName] = useState("");
  const [addAddr, setAddAddr] = useState("");
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const files = useMemo(() => {
    const s = slug(project.name);
    const list: { name: string; what: string; make: () => string }[] = [];
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
        make: () =>
          B.art
            .board(
              { name: project.name, medium: project.medium, stage: "build" },
              "render",
              { thumb: true },
            )
            .svg.replace(
              "<svg ",
              '<svg xmlns="http://www.w3.org/2000/svg" ',
            ),
      });
    }
    list.push({
      name: `${s}-brief.md`,
      what: "Project brief — every decision and note, for whoever builds it",
      make: () =>
        brief({
          name: project.name,
          workshopName,
          kindLabel: medium.label,
          stageLabel,
          tagline: project.tagline,
          notes,
          drafts,
          topics: tools,
        }),
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  // Makers appear after a beat, like a search.
  useEffect(() => {
    if (flow !== "quote" || vendors) return;
    const kinds = B.MAKER_KINDS[project.medium] ?? B.MAKER_KINDS.hardware;
    const found: Vendor[] = kinds.map((k, i) => ({
      id: `v${i}`,
      name: `${k.kind} (example)`,
      does: k.does,
      contact: k.contact,
      address:
        k.contact === "phone"
          ? "[phone number]"
          : k.contact === "email"
            ? "[email address]"
            : "[website]",
    }));
    found.push({
      id: "mark",
      name: "Mark's Manufacturer",
      does: "CNC + assembly · Made in America",
      contact: "email",
      address: "quotes@marks.example",
    });
    setVendors(found);
    const sel: Record<string, boolean> = {};
    found.forEach((v) => {
      sel[v.id] = true;
    });
    setSelected(sel);
    const t = window.setTimeout(() => setSearching(false), 1400);
    timers.current.push(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow]);

  // Simulated outreach statuses.
  useEffect(() => {
    if (flow !== "quote" || step !== 3 || !vendors) return;
    const chosen = vendors.filter((v) => selected[v.id]);
    chosen.forEach((v, i) => {
      [1, 2].forEach((stage) => {
        const t = window.setTimeout(
          () => setReach((r) => ({ ...r, [v.id]: stage })),
          900 + i * 900 + stage * 1300,
        );
        timers.current.push(t);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Quotes land when their step opens.
  useEffect(() => {
    if (flow !== "quote" || step !== 4 || quotes || !vendors) return;
    const base =
      ({ hardware: 900, print: 120, space: 4200 })[
        project.medium as "hardware" | "print" | "space"
      ] ?? 500;
    const made: Quote[] = vendors
      .filter((v) => selected[v.id])
      .map((v, i) => {
        const h = B.hash(project.name + v.id);
        return {
          id: v.id,
          vendor: v.name,
          price: Math.round((base * (0.75 + (h % 60) / 100)) / 10) * 10,
          lead: [3, 2, 4, 5, 1][(h >> 3) % 5] + i,
          note: QUOTE_NOTES[(h >> 5) % QUOTE_NOTES.length],
        };
      })
      .sort((a, b) => a.price - b.price);
    setQuotes(made);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Simulated software build log.
  function runBuild() {
    setStarted(true);
    const link = `${window.location.origin}/projects/${appId}`;
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
    const link = `${window.location.origin}/projects/${appId}`;
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
    return `Hello,

I'm an AI assistant writing on behalf of [YOUR NAME] at ${workshopName}. We're looking for a quote to make the following:

${project.name}${project.tagline ? " — " + project.tagline : ""}
Quantity: 1.
${decided ? "\nKey requirements:\n" + decided + "\n" : ""}
CAD files and a full brief are attached. Could you reply with a price, lead time, and anything you'd change to make it easier or cheaper to build?

Thank you,
[YOUR NAME] (sent by their assistant — replies go straight to them)`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  async function order() {
    const q = quotes?.find((x) => x.id === pick);
    if (!q) return;
    setBusy(true);
    setProblem("");
    const res = await placeOrder(appId, {
      vendor: q.vendor,
      price: q.price,
      lead: q.lead,
    });
    if (!res.ok) {
      setBusy(false);
      setProblem("Couldn't place the order. Try again.");
      return;
    }
    await addProjectNote(appId, {
      who: "apprentice",
      text: `Ordered from ${q.vendor} for $${q.price.toLocaleString()}. They said ${q.lead} week${q.lead > 1 ? "s" : ""} — I'll track it and tell you when it lands.`,
    });
    setBusy(false);
    setDone(q);
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
    router.refresh();
    onClose();
  }

  async function finish() {
    setBusy(true);
    const res = await markFinished(appId);
    setBusy(false);
    if (!res.ok) {
      setProblem("Couldn't save that. Try again.");
      return;
    }
    router.refresh();
    onClose();
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
              onClick={() => B.download(f.name, files[i].make())}
            >
              Download
            </button>
          </li>
        ))}
      </ul>
    );
  }

  function quoteBody(): ReactNode {
    if (done && typeof done === "object") {
      const line =
        project.medium === "hardware"
          ? "Machine arrives in 2 weeks. Make sure to take a picture and add it to your Workshop!"
          : `${project.name} arrives in 2 weeks. Make sure to take a picture and add it to your Workshop!`;
      return (
        <>
          <p className="hand" style={{ fontSize: 26, margin: 0, lineHeight: 1.2 }}>
            Order placed with {done.vendor} for ${done.price.toLocaleString()}.
          </p>
          <p className="hand" style={{ fontSize: 26, margin: 0, lineHeight: 1.2 }}>
            {line}
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
      if (searching || !vendors) {
        return (
          <>
            <p
              style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}
            >
              <BIcon svg={B.icon("search")} /> Looking for makers who can build
              a {medium.thing} like this…{" "}
              <span className="thinking" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </p>
            <p className="sim">
              Demo: in the real app this searches for actual shops near you.
            </p>
          </>
        );
      }
      const any = Object.values(selected).some(Boolean);
      return (
        <>
          <p style={{ margin: 0 }}>
            I found makers who can build this. Pick who should get the
            request, or add someone you already know.
          </p>
          <p className="sim">
            Demo placeholders. A real build fills these with actual businesses
            near you.
          </p>
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
              disabled={!any}
              onClick={() => setStep(2)}
            >
              Draft the message <BIcon svg={B.icon("fwd")} />
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
            Here&apos;s what I&apos;ll send. Edit anything — nothing goes out
            until you press approve.
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
              <BIcon svg={B.icon("check")} /> Approve and send
            </button>
          </div>
        </>
      );
    }
    if (step === 3) {
      const chosen = (vendors ?? []).filter((v) => selected[v.id]);
      const label = (v: Vendor) => {
        const r = reach[v.id] || 0;
        const seq =
          v.contact === "phone"
            ? ["Calling…", "Spoke to the front desk", "Quote received"]
            : v.contact === "web"
              ? ["Filling in the form…", "Submitted", "Quote received"]
              : ["Sending email…", "Delivered", "Quote received"];
        return (
          <span className={r >= 2 ? "status-ok" : "status-wait"}>
            {seq[Math.min(r, 2)]}
          </span>
        );
      };
      const allDone = chosen.every((v) => (reach[v.id] || 0) >= 2);
      return (
        <>
          <p style={{ margin: 0 }}>
            Reaching out now. I&apos;ll let you know the moment quotes come in.
          </p>
          <ul className="reach">
            {chosen.map((v) => (
              <li key={v.id}>
                <BIcon svg={B.icon(contactIcon(v.contact), 20)} />
                <div className="grow">
                  <strong>{v.name}</strong>
                </div>
                {label(v)}
              </li>
            ))}
          </ul>
          <p className="sim">
            Simulated. Connect email, phone and web-form services to make this
            real.
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!allDone}
              onClick={() => setStep(4)}
            >
              See the quotes <BIcon svg={B.icon("fwd")} />
            </button>
          </div>
        </>
      );
    }
    const best = quotes?.[0];
    return (
      <>
        <p style={{ margin: 0 }}>
          Quotes are in.{" "}
          {best
            ? `${best.vendor} is cheapest at $${best.price.toLocaleString()}.`
            : ""}
        </p>
        <div className="quotes-wrap">
          <table className="quotes">
            <thead>
              <tr>
                <th scope="col">Maker</th>
                <th scope="col">Price</th>
                <th scope="col">Lead time</th>
                <th scope="col">Their note</th>
                <th scope="col">
                  <span className="sr-only">Choose</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(quotes ?? []).map((q) => (
                <tr key={q.id}>
                  <td>
                    <strong>{q.vendor}</strong>
                  </td>
                  <td>${q.price.toLocaleString()}</td>
                  <td>
                    {q.lead} week{q.lead > 1 ? "s" : ""}
                  </td>
                  <td className="small">{q.note}</td>
                  <td>
                    <button
                      type="button"
                      className={`btn${pick === q.id ? " btn-dark" : ""}`}
                      aria-pressed={pick === q.id}
                      onClick={() => setPick(q.id)}
                    >
                      {pick === q.id ? "Chosen" : "Choose"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sim">Example quotes for the demo — not real prices.</p>
        {problem !== "" && (
          <p className="small" style={{ margin: 0, color: "var(--red)" }}>
            {problem}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            Decide later
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!pick || busy}
            onClick={() => void order()}
          >
            <BIcon svg={B.icon("crate")} />{" "}
            {busy ? "Ordering…" : "Place the order"}
          </button>
        </div>
      </>
    );
  }

  function shipBody(): ReactNode {
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
            Simulated build. A real build runs the generated code through
            tests and packaging.
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
    return (
      <>
        <p style={{ margin: 0 }}>Here&apos;s everything, ready to share.</p>
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

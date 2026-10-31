"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { detectMedium, isMediumId } from "@/lib/design/project-art";

import "@/vendor/bottega/core.js";
import "@/vendor/bottega/types.js";
import Dialog, { BIcon } from "./Dialog";

export default function NewProjectDialog({
  onClose,
  workshop,
  initialDesc = "",
}: {
  onClose: () => void;
  workshop: { id: string; name: string; type: string };
  initialDesc?: string;
}) {
  const B = window.B;
  const router = useRouter();
  const [desc, setDesc] = useState(initialDesc);
  const [medium, setMedium] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [problem, setProblem] = useState("");
  const descRef = useRef<HTMLTextAreaElement>(null);
  const def =
    B.WORKSHOP_TYPES[workshop.type] ?? B.WORKSHOP_TYPES.other;
  const meds = def.mediums.concat(
    Object.keys(B.MEDIUMS).filter((k) => !def.mediums.includes(k)),
  );

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function submit() {
    const d = desc.trim();
    if (!d) {
      descRef.current?.focus();
      return;
    }
    setBusy(true);
    setElapsed(0);
    setProblem("");
    const fallback = isMediumId(def.defaultMedium)
      ? def.defaultMedium
      : "software";
    const kind =
      isMediumId(medium) && medium ? medium : detectMedium(d, fallback);
    let res: Response;
    try {
      res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: d.slice(0, 1500),
          workshopId: workshop.id,
          kind,
        }),
      });
    } catch {
      setBusy(false);
      setProblem("The model didn't answer. Try again.");
      return;
    }
    if (res.ok) {
      const data = (await res.json()) as { appId: string };
      sessionStorage.setItem("bottega:new-project", data.appId);
      router.push(`/projects/${data.appId}`);
      return;
    }
    setBusy(false);
    if (res.status === 503) {
      setProblem("The builder is off right now (no model key).");
    } else if (res.status === 422) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setProblem(data?.error ?? "That didn't work. Try again.");
    } else {
      setProblem("The model didn't answer. Try again.");
    }
  }

  return (
    <Dialog labelledBy="np-title" onClose={onClose}>
      <form
        style={{ display: "contents" }}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="dialog-head">
          <h2 id="np-title">What are we making?</h2>
          <button
            type="button"
            className="icon-btn ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <BIcon svg={B.icon("close", 20)} />
          </button>
        </div>
        <label className="lbl" htmlFor="np-desc">
          Say it plainly. Your apprentice picks the right bench and tools for
          it in {workshop.name}.
        </label>
        <textarea
          id="np-desc"
          ref={descRef}
          rows={3}
          autoFocus
          value={desc}
          disabled={busy}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={B.cap(def.examples[0])}
        />
        <p className="eyebrow" style={{ margin: 0 }}>
          It&apos;s mostly
        </p>
        <div className="chips" role="group" aria-label="Kind of project">
          {meds.map((k) => (
            <button
              key={k}
              type="button"
              className="chip"
              aria-pressed={medium === k}
              disabled={busy}
              onClick={() => setMedium((cur) => (cur === k ? "" : k))}
            >
              {B.MEDIUMS[k].label}
            </button>
          ))}
        </div>
        <p className="small" style={{ margin: 0 }}>
          Not sure? Leave it — your apprentice will guess from what you wrote.
        </p>
        {busy && (
          <p className="small" style={{ margin: 0 }}>
            Muse Spark is designing… {elapsed}s
          </p>
        )}
        {problem !== "" && (
          <p className="small" style={{ margin: 0, color: "var(--red)" }}>
            {problem}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            <BIcon svg={B.icon("pencil")} />{" "}
            {busy ? "Designing…" : "Start sketching"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

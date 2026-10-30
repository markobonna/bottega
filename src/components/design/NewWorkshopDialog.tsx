"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkshop } from "@/app/actions";

import "@/vendor/bottega/core.js";
import "@/vendor/bottega/types.js";
import Dialog, { BIcon } from "./Dialog";

export default function NewWorkshopDialog({
  onClose,
  workshopCount,
}: {
  onClose: () => void;
  workshopCount: number;
}) {
  const B = window.B;
  const router = useRouter();
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const descRef = useRef<HTMLTextAreaElement>(null);
  const types = Object.entries(B.WORKSHOP_TYPES);

  async function submit() {
    const d = desc.trim();
    if (!d && !type) {
      descRef.current?.focus();
      return;
    }
    if (workshopCount >= 4) {
      setProblem("Your island is full.");
      return;
    }
    setBusy(true);
    setProblem("");
    const def = (type && B.WORKSHOP_TYPES[type]) || B.WORKSHOP_TYPES.other;
    const name = d
      ? B.cap(d.split(/[.,;!?]/)[0].trim().slice(0, 40))
      : def.article;
    const form = new FormData();
    form.set("name", name);
    if (type) form.set("type", type);
    try {
      const { id } = await createWorkshop(form);
      sessionStorage.setItem("bottega:new-workshop", id);
      router.push(`/workshops/${id}`);
    } catch {
      setBusy(false);
      setProblem("Couldn't create it. Try again.");
    }
  }

  return (
    <Dialog labelledBy="nw-title" onClose={onClose}>
      <form
        style={{ display: "contents" }}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="dialog-head">
          <h2 id="nw-title">What&apos;s this place?</h2>
          <button
            type="button"
            className="icon-btn ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <BIcon svg={B.icon("close", 20)} />
          </button>
        </div>
        <label className="lbl" htmlFor="nw-desc">
          Describe it like you&apos;d tell a friend. Your apprentice will
          sketch it onto the lot.
        </label>
        <textarea
          id="nw-desc"
          ref={descRef}
          rows={3}
          autoFocus
          value={desc}
          disabled={busy}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="My café on 5th Street — a small espresso bar with a roaster in the back"
        />
        <p className="eyebrow" style={{ margin: 0 }}>
          Or start from
        </p>
        <div className="chips" role="group" aria-label="Kind of place">
          {types.map(([id, t]) => (
            <button
              key={id}
              type="button"
              className="chip"
              aria-pressed={type === id}
              disabled={busy}
              onClick={() => setType((cur) => (cur === id ? "" : id))}
            >
              {t.label}
            </button>
          ))}
        </div>
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
            <BIcon svg={B.icon("pencil")} /> {busy ? "Sketching…" : "Sketch it"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

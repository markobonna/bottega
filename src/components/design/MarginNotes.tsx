"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addProjectNote,
  type ProjectNote,
} from "@/app/projects/[id]/actions";
import { askApprentice } from "@/lib/apprentice-client";
import { topicLabel, type ToolEntry } from "@/lib/design/tools";

import "@/vendor/bottega/core.js";
import { BIcon } from "./Dialog";

const PLACEHOLDERS: Record<string, string> = {
  hardware: "It needs to fit under a 90 cm counter",
  software: "Customers should be able to use it without help",
  music: "Make the chorus lift more",
  dance: "Add a canon on counts 9–16",
  print: "Make the headline readable from the door",
  recipe: "Make it work with oat milk too",
  space: "We need room for a queue of 10",
};

export default function MarginNotes({
  appId,
  medium,
  initial,
  activePart,
  onPart,
  partLabel,
  locked,
  topics,
  topicId,
}: {
  appId: string;
  medium: string;
  initial: ProjectNote[];
  activePart: number;
  onPart: (n: number) => void;
  partLabel: (n: number) => string;
  locked: boolean;
  topics: ToolEntry[];
  topicId: string;
}) {
  const B = window.B;
  const router = useRouter();
  const [notes, setNotes] = useState(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function submit() {
    const clean = text.trim().slice(0, 2000);
    if (!clean || busy) return;
    setText("");
    setBusy(true);
    setProblem("");
    const mine = await addProjectNote(appId, {
      who: "you",
      text: clean,
      part: activePart,
      topic: topicId,
    });
    if (!mine.ok) {
      setBusy(false);
      setProblem("Couldn't save that. Try again.");
      return;
    }
    setNotes((ns) => [...ns, mine.note]);
    try {
      const data = await askApprentice(clean, [], { appId });
      const say = data.say ?? "";
      if (say) {
        const theirs = await addProjectNote(appId, {
          who: "apprentice",
          text: say,
          part: activePart,
          topic: topicId,
        });
        if (theirs.ok) setNotes((ns) => [...ns, theirs.note]);
      }
    } catch {
      setProblem("Saved. The apprentice didn't answer — try again.");
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  const focusLabel = topicLabel(topics, topicId) ?? "General";
  return (
    <aside id="margin-notes" className="margin" aria-label="Margin notes">
      <div className="margin-head">
        <BIcon svg={B.sigil(40)} />
        <div>
          <h2 className="h2" style={{ fontSize: 26 }}>
            Margin notes
          </h2>
          <p className="small" style={{ margin: "2px 0 0" }}>
            You and your apprentice, pinned to the parts
          </p>
        </div>
      </div>
      <div className="notes">
        {notes.length === 0 ? (
          <p className="hand" style={{ fontSize: 22, margin: 0 }}>
            Nothing in the margins yet. Tell me what this needs to do.
          </p>
        ) : (
          notes.map((n) => (
            <article
              key={n.id}
              className={`mnote${n.part === activePart ? " active" : ""}`}
            >
              <div className="row">
                {n.part ? (
                  <>
                    <button
                      type="button"
                      className="num"
                      onClick={() => onPart(n.part as number)}
                      aria-label={`Show part ${n.part}`}
                    >
                      {n.part}
                    </button>
                    <strong>{partLabel(n.part)}</strong>
                  </>
                ) : (
                  <strong>General</strong>
                )}
                {n.topic ? (
                  <span className="who">{topicLabel(topics, n.topic)}</span>
                ) : null}
                <span className="who">
                  {n.who === "you" ? "You" : "Apprentice"}
                </span>
              </div>
              <p className={n.who === "you" ? "say-y" : "say-a"}>{n.text}</p>
            </article>
          ))
        )}
        {busy && (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="thinking" aria-label="Thinking">
              <i />
              <i />
              <i />
            </span>
            <span className="small">Asking Muse Spark…</span>
          </span>
        )}
      </div>
      {!locked && (
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label htmlFor="margin-input" style={{ fontSize: 14, fontWeight: 700 }}>
            {focusLabel} note, pinned to {activePart}: {partLabel(activePart)}
          </label>
          <div className="row">
            <input
              id="margin-input"
              type="text"
              autoComplete="off"
              value={text}
              disabled={busy}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDERS[medium] ?? "Add a note"}
            />
            <button
              type="submit"
              className="icon-btn"
              disabled={busy}
              style={{
                background: "var(--red)",
                color: "var(--card)",
                borderColor: "var(--red)",
                borderRadius: 6,
              }}
              aria-label="Add note"
            >
              <BIcon svg={B.icon("send", 20)} />
            </button>
          </div>
          {problem !== "" && (
            <p className="small" style={{ margin: 0, color: "var(--red)" }}>
              {problem}
            </p>
          )}
        </form>
      )}
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";
import { btn, DataNotice, Label, Status } from "@/components/ui";
import { inputCls } from "@/components/blocks/Form";
import BuildReveal from "@/components/workshop/BuildReveal";
import {
  detectMedium,
  MEDIUM_IDS,
  type DesignMedium,
} from "@/lib/design/project-art";
import type { AppSpec } from "@/lib/spec/schema";
import { useRecorder } from "@/lib/wav";
import { createSample } from "../actions";

type Phase = "idle" | "busy" | "done" | "off" | "invalid" | "failed";

export default function BuildForm({
  workshopId,
  initialText = "",
}: {
  workshopId: string;
  initialText?: string;
}) {
  const [text, setText] = useState(initialText);
  const [kind, setKind] = useState<DesignMedium>(() =>
    initialText.trim() ? detectMedium(initialText) : "software",
  );
  const [kindTouched, setKindTouched] = useState(false);

  function onText(value: string) {
    setText(value);
    if (!kindTouched) setKind(detectMedium(value));
  }
  function pickKind(next: DesignMedium) {
    setKind(next);
    setKindTouched(true);
  }
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{
    appId: string;
    spec: AppSpec;
    answeredBy?: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [micProblem, setMicProblem] = useState("");
  const [micOff, setMicOff] = useState(false);

  const mic = useRecorder({
    onBlob: (blob) =>
      void (async () => {
        setMicProblem("");
        try {
          const form = new FormData();
          form.append("audio", blob, "audio.wav");
          const res = await fetch("/api/hear", { method: "POST", body: form });
          if (res.ok) {
            const data = (await res.json()) as { transcript: string };
            setText((t) =>
              (t === "" ? data.transcript : `${t} ${data.transcript}`).slice(
                0,
                1500,
              ),
            );
          } else if (res.status === 503) {
            setMicOff(true);
          } else if (res.status === 429) {
            setMicProblem("Too many voice requests at once. Try again in a moment.");
          } else {
            setMicProblem("The model didn't answer. Try again.");
          }
        } catch {
          setMicProblem("The model didn't answer. Try again.");
        }
      })(),
    onDenied: () =>
      setMicProblem(
        "Bottega can't hear you: allow the microphone in your browser settings.",
      ),
    onFailed: () => setMicProblem("Recording failed."),
  });

  useEffect(() => {
    if (phase !== "busy") return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  async function build() {
    setPhase("busy");
    setElapsed(0);
    let res: Response;
    try {
      res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text, workshopId, kind }),
      });
    } catch {
      setPhase("failed");
      return;
    }
    if (res.ok) {
      const done = (await res.json()) as {
        appId: string;
        spec: AppSpec;
        answeredBy?: string;
      };
      sessionStorage.setItem("bottega:new-project", done.appId);
      setResult(done);
      setPhase("done");
    } else if (res.status === 503) {
      setPhase("off");
    } else if (res.status === 422) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setMessage(data?.error ?? "That didn't work. Try again.");
      setPhase("invalid");
    } else {
      setPhase("failed");
    }
  }

  if (phase === "done" && result) {
    return (
      <BuildReveal
        appId={result.appId}
        spec={result.spec}
        answeredBy={result.answeredBy}
      />
    );
  }

  const busy = phase === "busy";
  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="describe">
          What do you do, and what do you keep losing track of?
        </Label>
        <textarea
          id="describe"
          rows={5}
          maxLength={1500}
          value={text}
          disabled={busy}
          aria-describedby="describe-count"
          placeholder="I bake for cafés and take custom cake orders…"
          onChange={(e) => onText(e.target.value)}
          className={inputCls}
        />
        <p id="describe-count" className="text-muted text-sm">
          {text.length} / 1500
        </p>
        <div
          role="group"
          aria-label="What kind of project is this?"
          className="flex flex-wrap gap-2"
        >
          {MEDIUM_IDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              disabled={busy}
              onClick={() => pickKind(k)}
              className={`${btn.quiet} ${btn.small} capitalize`}
            >
              {k}
            </button>
          ))}
        </div>
        <DataNotice />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={text.length < 10 || busy}
          onClick={() => void build()}
          className={btn.primary}
        >
          {busy ? "Designing…" : "Build my project"}
        </button>
        <button
          type="button"
          aria-label="Dictate"
          aria-pressed={mic.recording}
          disabled={busy || micOff}
          {...mic.handlers}
          className={`${btn.quiet} rounded-full! px-3!`}
        >
          🎙️
        </button>
        {mic.recording && (
          <p className="text-muted text-sm">{mic.secs}s</p>
        )}
      </div>
      {busy && <p className="text-muted text-sm">{elapsed}s</p>}
      {micOff && (
        <Status tone="muted">Voice is off right now (no model key).</Status>
      )}
      {micProblem !== "" && <Status tone="bad">{micProblem}</Status>}
      {phase === "off" && (
        <div className="flex flex-col gap-2">
          <Status tone="muted">
            The builder is off right now (no model key). You can start from a
            sample instead.
          </Status>
          <div className="flex flex-wrap gap-2">
            <form action={createSample.bind(null, "maria", workshopId)}>
              <button type="submit" className={btn.quiet}>
                A bakery
              </button>
            </form>
            <form action={createSample.bind(null, "cole", workshopId)}>
              <button type="submit" className={btn.quiet}>
                A furniture restorer
              </button>
            </form>
          </div>
        </div>
      )}
      {phase === "invalid" && (
        <div className="flex flex-col items-start gap-2">
          <Status tone="bad">{message}</Status>
          <button
            type="button"
            onClick={() => void build()}
            className={btn.quiet}
          >
            Try again
          </button>
        </div>
      )}
      {phase === "failed" && (
        <Status tone="bad">The model didn&apos;t answer. Try again.</Status>
      )}
    </div>
  );
}

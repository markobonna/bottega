"use client";

import { useEffect, useState } from "react";
import { btn, DataNotice, Label, Status } from "@/components/ui";
import { inputCls } from "@/components/blocks/Form";
import BuildReveal from "@/components/workshop/BuildReveal";
import type { AppSpec } from "@/lib/spec/schema";
import { createSample } from "../actions";

type Phase = "idle" | "busy" | "done" | "off" | "invalid" | "failed";

export default function BuildForm() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ appId: string; spec: AppSpec } | null>(
    null,
  );
  const [message, setMessage] = useState("");

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
        body: JSON.stringify({ description: text }),
      });
    } catch {
      setPhase("failed");
      return;
    }
    if (res.ok) {
      setResult((await res.json()) as { appId: string; spec: AppSpec });
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
    return <BuildReveal appId={result.appId} spec={result.spec} />;
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
          onChange={(e) => setText(e.target.value)}
          className={inputCls}
        />
        <p id="describe-count" className="text-muted text-sm">
          {text.length} / 1500
        </p>
        <DataNotice />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={text.length < 10 || busy}
          onClick={() => void build()}
          className={btn.primary}
        >
          {busy ? "Designing…" : "Build my app"}
        </button>
        {/* Prompt 19 adds the mic button here. */}
      </div>
      {busy && <p className="text-muted text-sm">{elapsed}s</p>}
      {phase === "off" && (
        <div className="flex flex-col gap-2">
          <Status tone="muted">
            The builder is off right now (no model key). You can start from a
            sample instead.
          </Status>
          <div className="flex flex-wrap gap-2">
            <form action={createSample.bind(null, "maria")}>
              <button type="submit" className={btn.quiet}>
                A bakery
              </button>
            </form>
            <form action={createSample.bind(null, "cole")}>
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

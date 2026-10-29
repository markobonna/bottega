"use client";

import { useState } from "react";
import { createRecord, logEvent } from "@/app/projects/[id]/actions";
import { btn, DataNotice, Status } from "@/components/ui";
import { FieldInput, type FieldValue } from "./Form";
import type { BlockProps } from "../runtime/registry";
import { useRecorder } from "@/lib/wav";

export default function Hear({ block, spec, ctx }: BlockProps) {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [working, setWorking] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [voiceOff, setVoiceOff] = useState(false);
  const [status, setStatus] = useState<{
    tone: "ok" | "bad" | "muted";
    message: string;
  }>({ tone: "ok", message: "" });

  const mic = useRecorder({
    onBlob: (blob) =>
      void (async () => {
        if (block.type !== "hear") return;
        setWorking(true);
        setStatus({ tone: "ok", message: "" });
        try {
          const form = new FormData();
          form.append("audio", blob, "audio.wav");
          form.append("appId", ctx.appId);
          form.append("blockId", block.id);
          const res = await fetch("/api/hear", { method: "POST", body: form });
          if (res.ok) {
            const data = (await res.json()) as {
              transcript: string;
              values: Record<string, string | number | boolean>;
            };
            setTranscript(data.transcript);
            setValues(data.values);
          } else if (res.status === 503) {
            setVoiceOff(true);
            setValues({});
          } else if (res.status === 429) {
            setStatus({
              tone: "bad",
              message: "Too many voice requests at once. Try again in a moment.",
            });
          } else {
            setStatus({ tone: "bad", message: "The model didn't answer. Try again." });
          }
        } catch {
          setStatus({ tone: "bad", message: "The model didn't answer. Try again." });
        } finally {
          setWorking(false);
        }
      })(),
    onDenied: () =>
      setStatus({
        tone: "bad",
        message:
          "Bottega can't hear you: allow the microphone in your browser settings.",
      }),
    onFailed: () =>
      setStatus({ tone: "bad", message: "Recording failed." }),
  });

  if (block.type !== "hear") return null;
  const coll = spec.collections.find((c) => c.id === block.collection);
  if (!coll) return null;
  const fields = block.fields.flatMap(
    (fid) => coll.fields.find((f) => f.id === fid) ?? [],
  );

  async function save() {
    if (block.type !== "hear") return;
    setSaveBusy(true);
    setStatus({ tone: "ok", message: "" });
    try {
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v !== "" && v !== undefined) cleaned[k] = v;
      }
      const result = await createRecord(ctx.appId, block.collection, cleaned);
      if (!result.ok) {
        setStatus({ tone: "bad", message: result.error });
      } else {
        setValues({});
        setTranscript(null);
        setStatus({ tone: "ok", message: "Logged." });
        void logEvent(ctx.appId, "record_added", { collection: block.collection });
        ctx.refresh();
      }
    } catch (e) {
      setStatus({
        tone: "bad",
        message: e instanceof Error ? e.message : "Couldn't save.",
      });
    } finally {
      setSaveBusy(false);
    }
  }

  const showForm = transcript !== null || voiceOff;

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        aria-pressed={mic.recording}
        disabled={working || voiceOff}
        {...mic.handlers}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-accent px-2 text-center text-sm font-semibold text-accent-ink disabled:opacity-50"
      >
        {mic.recording ? "Listening…" : "Hold to talk"}
      </button>
      <p className="text-sm text-muted">{block.hint}</p>
      {mic.recording && <p className="text-sm text-muted">{mic.secs}s</p>}
      <DataNotice />
      {working && <Status tone="muted">Writing it down…</Status>}
      {voiceOff && (
        <Status tone="muted">
          Voice is off right now (no model key). Type it instead.
        </Status>
      )}
      {transcript !== null && (
        <blockquote className="border-l-[3px] border-line pl-3 italic">
          “{transcript}”
        </blockquote>
      )}
      {showForm && (
        <div className="flex w-full flex-col gap-3">
          {fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={(v) => setValues((s) => ({ ...s, [field.id]: v }))}
              id={`${block.id}-${field.id}`}
              appId={ctx.appId}
            />
          ))}
          <button
            type="button"
            disabled={saveBusy}
            onClick={() => void save()}
            className={`${btn.primary} self-start`}
          >
            {saveBusy ? "Saving…" : "Save"}
          </button>
        </div>
      )}
      {status.message !== "" && (
        <Status tone={status.tone}>{status.message}</Status>
      )}
    </div>
  );
}

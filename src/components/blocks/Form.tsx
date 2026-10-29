"use client";

import { useEffect, useRef, useState } from "react";
import { createRecord, logEvent } from "@/app/projects/[id]/actions";
import { resizeToJpeg, uploadPhoto } from "@/lib/media";
import type { Field } from "@/lib/spec/schema";
import { DataNotice, Label, Status, btn } from "../ui";
import type { BlockProps } from "../runtime/registry";

export type FieldValue = string | number | boolean | undefined;

export type FieldInputProps = {
  field: Field;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  id: string;
  appId: string;
};

export const inputCls =
  "w-full rounded-[12px] border-[1.5px] border-line bg-card px-4 py-2.5 text-ink placeholder:text-muted";

function PhotoInput({ field, value, onChange, id, appId }: FieldInputProps) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setProblem("");
    try {
      setPreview(URL.createObjectURL(file));
      const small = await resizeToJpeg(file);
      onChange(await uploadPhoto(appId, small));
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Photo failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Label htmlFor={id}>{field.name}</Label>
      <input
        ref={fileRef}
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      {preview !== null && (
        <img
          src={preview}
          alt=""
          className="h-24 w-24 rounded-[12px] object-cover"
        />
      )}
      {preview === null && typeof value === "string" && value !== "" && (
        <p className="text-sm text-muted">Photo attached</p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className={btn.quiet}
      >
        {busy ? "Uploading…" : value ? "Change photo" : "Take or choose a photo"}
      </button>
      {problem !== "" && <Status tone="bad">{problem}</Status>}
      <DataNotice />
    </div>
  );
}

export function FieldInput(props: FieldInputProps) {
  const { field, value, onChange, id } = props;
  if (field.type === "photo") return <PhotoInput {...props} />;
  const text = typeof value === "string" ? value : "";
  switch (field.type) {
    case "text":
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id}>{field.name}</Label>
          <input
            id={id}
            type="text"
            value={text}
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
          />
        </div>
      );
    case "number":
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id}>{field.name}</Label>
          <input
            id={id}
            type="text"
            inputMode="decimal"
            value={typeof value === "number" ? String(value) : text}
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
          />
        </div>
      );
    case "date":
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id}>{field.name}</Label>
          <input
            id={id}
            type="date"
            value={text}
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
          />
        </div>
      );
    case "choice":
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id}>{field.name}</Label>
          <select
            id={id}
            value={text}
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
          >
            <option value="">Choose…</option>
            {(field.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      );
    case "bool":
      return (
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="h-5 w-5 accent-[var(--accent)]"
          />
          <Label htmlFor={id}>{field.name}</Label>
        </div>
      );
  }
}

export default function Form({ block, spec, ctx }: BlockProps) {
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [status, setStatus] = useState<{
    tone: "ok" | "bad";
    message: string;
  }>({ tone: "ok", message: "" });
  const [busy, setBusy] = useState(false);

  if (block.type !== "form") return null;
  const coll = spec.collections.find((c) => c.id === block.collection);
  if (!coll) return null;
  const fields = block.fields.flatMap(
    (fid) => coll.fields.find((f) => f.id === fid) ?? [],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v !== "" && v !== undefined) cleaned[k] = v;
      }
      const result = await createRecord(ctx.appId, block.collection, cleaned);
      if (!result.ok) {
        setStatus({ tone: "bad", message: result.error });
        return;
      }
      setValues({});
      setStatus({ tone: "ok", message: "Saved." });
      void logEvent(ctx.appId, "record_added", { collection: block.collection });
      ctx.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
      {fields.map((f) => (
        <FieldInput
          key={f.id}
          field={f}
          id={`form-${block.id}-${f.id}`}
          appId={ctx.appId}
          value={values[f.id]}
          onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))}
        />
      ))}
      <button type="submit" disabled={busy} className={`${btn.primary} mt-1`}>
        {busy ? "Saving…" : block.submitLabel}
      </button>
      <Status tone={status.tone}>{status.message}</Status>
    </form>
  );
}

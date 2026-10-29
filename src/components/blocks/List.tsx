"use client";

import { useEffect, useMemo, useState } from "react";
import {
  removeRecord,
  saveRecord,
  signPhotoPaths,
} from "@/app/projects/[id]/actions";
import type { DbRecord } from "@/lib/records";
import type { Collection, Field } from "@/lib/spec/schema";
import { Confirm, Label, Status, btn, card } from "../ui";
import { FieldInput, type FieldValue } from "./Form";
import type { BlockProps } from "../runtime/registry";

function formatValue(field: Field, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.type === "bool") return value === true ? "Yes" : "No";
  if (field.type === "date" && typeof value === "string") {
    const d = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(d.getTime())
      ? value
      : d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  }
  return String(value);
}

function ShowValue({
  field,
  value,
  urls,
}: {
  field: Field;
  value: unknown;
  urls: Record<string, string>;
}) {
  if (field.type === "photo" && typeof value === "string" && urls[value]) {
    return (
      <img
        src={urls[value]}
        alt=""
        className="h-14 w-14 rounded-[8px] object-cover"
      />
    );
  }
  if (field.type === "choice" && typeof value === "string" && value !== "") {
    return (
      <span className="inline-block rounded-full border border-line px-2 py-0.5 text-xs">
        {value}
      </span>
    );
  }
  return <span>{formatValue(field, value)}</span>;
}

function Editor({
  record,
  coll,
  appId,
  onClose,
  onChanged,
}: {
  record: DbRecord;
  coll: Collection;
  appId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [values, setValues] = useState<Record<string, FieldValue>>(
    () => (record.data as Record<string, FieldValue> | null) ?? {},
  );
  const [status, setStatus] = useState<{
    tone: "ok" | "bad";
    message: string;
  }>({ tone: "ok", message: "" });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      // No empty-stripping here (unlike Form): "" clears a text field, and
      // other types get a proper validation error instead of silent keeps.
      const result = await saveRecord(
        appId,
        record.id,
        values as Record<string, unknown>,
      );
      if (!result.ok) {
        setStatus({ tone: "bad", message: result.error });
        return;
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    const result = await removeRecord(appId, record.id);
    if (!result.ok) {
      setStatus({ tone: "bad", message: result.error });
      return;
    }
    onChanged();
  };

  return (
    <div className={`${card} flex flex-col gap-3 p-3`}>
      {coll.fields.map((f) => (
        <FieldInput
          key={f.id}
          field={f}
          id={`edit-${record.id}-${f.id}`}
          appId={appId}
          value={values[f.id]}
          onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))}
        />
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className={btn.primary}
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <Confirm label="Delete" onConfirm={() => void del()} />
        <button type="button" onClick={onClose} className={btn.quiet}>
          Close
        </button>
      </div>
      <Status tone={status.tone}>{status.message}</Status>
    </div>
  );
}

export default function List({ block, spec, records, ctx }: BlockProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  if (block.type !== "list") return null;
  const coll = spec.collections.find((c) => c.id === block.collection);
  if (!coll) return null;
  const showFields = block.show.flatMap(
    (fid) => coll.fields.find((f) => f.id === fid) ?? [],
  );
  const photoIds = showFields
    .filter((f) => f.type === "photo")
    .map((f) => f.id);

  const photoPaths = useMemo(() => {
    const paths: string[] = [];
    for (const r of records) {
      const data = r.data as Record<string, unknown>;
      for (const fid of photoIds) {
        const v = data[fid];
        if (typeof v === "string" && v !== "") paths.push(v);
      }
    }
    return [...new Set(paths)];
  }, [records, photoIds.join(",")]);

  useEffect(() => {
    let live = true;
    signPhotoPaths(photoPaths).then((r) => {
      if (live && r.ok) setUrls(r.urls);
    });
    return () => {
      live = false;
    };
  }, [photoPaths]);

  const shown = useMemo(() => {
    if (!block.sort) return records;
    const { field, dir } = block.sort;
    const val = (r: DbRecord) => (r.data as Record<string, unknown>)[field];
    const cmp = (a: unknown, b: unknown) => {
      if (typeof a === "number" && typeof b === "number") return a - b;
      return String(a ?? "").localeCompare(String(b ?? ""));
    };
    return [...records].sort((x, y) =>
      dir === "asc" ? cmp(val(x), val(y)) : cmp(val(y), val(x)),
    );
  }, [records, block.sort]);

  if (records.length === 0) {
    return <p className="text-muted">Nothing here yet.</p>;
  }

  const changed = () => {
    setOpenId(null);
    ctx.refresh();
  };

  return (
    <div className="flex flex-col gap-2">
      {shown.map((r) =>
        openId === r.id ? (
          <Editor
            key={r.id}
            record={r}
            coll={coll}
            appId={ctx.appId}
            onClose={() => setOpenId(null)}
            onChanged={changed}
          />
        ) : (
          <button
            key={r.id}
            type="button"
            onClick={() => setOpenId(r.id)}
            className={`${card} w-full cursor-pointer p-3 text-left`}
          >
            <div className="flex flex-col gap-2">
              {showFields.map((f) => (
                <div key={f.id}>
                  <Label>{f.name}</Label>
                  <div className="mt-0.5">
                    <ShowValue
                      field={f}
                      value={(r.data as Record<string, unknown>)[f.id]}
                      urls={urls}
                    />
                  </div>
                </div>
              ))}
            </div>
          </button>
        ),
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  getOrCreateShare,
  logEvent,
  revokeShare,
  saveRecord,
  signPhotoPaths,
} from "@/app/projects/[id]/actions";
import { btn, Confirm, Label, Status } from "@/components/ui";
import { resizeToJpeg, uploadPhoto } from "@/lib/media";
import type { BlockProps } from "../runtime/registry";

export default function Compare({ block, records, ctx }: BlockProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [share, setShare] = useState<{ token: string; url: string } | null>(
    null,
  );
  const [shareBusy, setShareBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

  if (block.type !== "compare") return null;

  const sorted = [...records].sort(
    (a, b) => +new Date(b.created_at ?? "") - +new Date(a.created_at ?? ""),
  );
  const selectedId = sorted.some((r) => r.id === selected)
    ? (selected as string)
    : (sorted[0]?.id ?? null);
  const row = sorted.find((r) => r.id === selectedId) ?? null;
  const data = (row?.data ?? {}) as Record<string, unknown>;
  const beforePath =
    typeof data[block.before] === "string" &&
    (data[block.before] as string) !== ""
      ? (data[block.before] as string)
      : null;
  const afterPath =
    typeof data[block.after] === "string" && (data[block.after] as string) !== ""
      ? (data[block.after] as string)
      : null;
  const caption =
    block.caption !== undefined &&
    typeof data[block.caption] === "string" &&
    (data[block.caption] as string) !== ""
      ? (data[block.caption] as string)
      : null;

  useEffect(() => {
    const paths = [beforePath, afterPath].filter(
      (p): p is string => p !== null,
    );
    if (paths.length === 0) return;
    let live = true;
    signPhotoPaths(paths).then((r) => {
      if (live && r.ok) setUrls((u) => ({ ...u, ...r.urls }));
    });
    return () => {
      live = false;
    };
  }, [beforePath, afterPath]);

  if (sorted.length === 0) return <p className="text-muted">Nothing here yet.</p>;
  if (!row) return null;

  async function attachPhoto(fieldId: string, file: File | undefined) {
    if (!file || !row) return;
    setUploadBusy(true);
    setProblem("");
    try {
      const small = await resizeToJpeg(file);
      const path = await uploadPhoto(ctx.appId, small);
      const saved = await saveRecord(ctx.appId, row.id, { [fieldId]: path });
      if (!saved.ok) setProblem(saved.error);
      else ctx.refresh();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Photo failed.");
    } finally {
      setUploadBusy(false);
    }
  }

  async function makeShare() {
    if (!row) return;
    setShareBusy(true);
    setProblem("");
    setCopied(false);
    try {
      const r = await getOrCreateShare(ctx.appId, row.id);
      if (!r.ok) setProblem(r.error);
      else {
        setShare({
          token: r.token,
          url: `${window.location.origin}/s/${r.token}`,
        });
        void logEvent(ctx.appId, "shared", {});
      }
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Sharing failed.");
    } finally {
      setShareBusy(false);
    }
  }

  async function copyLink() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
    } catch {
      setProblem("Copy didn't work.");
    }
  }

  async function stopSharing() {
    if (!share) return;
    setProblem("");
    const r = await revokeShare(share.token);
    if (!r.ok) setProblem(r.error);
    else {
      setShare(null);
      setCopied(false);
    }
  }

  const slots = [
    { label: "Before", path: beforePath, fieldId: block.before, ref: beforeRef },
    { label: "After", path: afterPath, fieldId: block.after, ref: afterRef },
  ] as const;

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex w-full flex-col gap-1.5">
        <Label htmlFor={`${block.id}-record`}>Record</Label>
        <select
          id={`${block.id}-record`}
          value={selectedId ?? ""}
          onChange={(e) => {
            setSelected(e.target.value);
            setShare(null);
            setCopied(false);
          }}
          className="w-full rounded-[12px] border-[1.5px] border-line bg-card px-4 py-2.5 text-ink"
        >
          {sorted.map((r) => {
            const d = (r.data ?? {}) as Record<string, unknown>;
            const v =
              block.caption !== undefined ? d[block.caption] : undefined;
            return (
              <option key={r.id} value={r.id}>
                {typeof v === "string" && v !== "" ? v : "Untitled"}
              </option>
            );
          })}
        </select>
      </div>
      {caption !== null && (
        <h3 className="font-display text-xl">{caption}</h3>
      )}
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        {slots.map((s) => (
          <div key={s.label} className="flex flex-1 flex-col gap-1.5">
            <Label>{s.label}</Label>
            <input
              ref={s.ref}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              aria-label={`Add a ${s.label.toLowerCase()} photo`}
              onChange={(e) => void attachPhoto(s.fieldId, e.target.files?.[0])}
            />
            {s.path !== null && urls[s.path] ? (
              <img
                src={urls[s.path]}
                alt={`${s.label} photo`}
                className="w-full rounded-[12px]"
              />
            ) : (
              <button
                type="button"
                disabled={uploadBusy}
                onClick={() => s.ref.current?.click()}
                className="checker flex min-h-32 w-full items-center justify-center rounded-[12px] p-4 text-sm text-muted"
              >
                {uploadBusy
                  ? "Uploading…"
                  : s.label === "After"
                    ? "Add an after photo"
                    : "Add a before photo"}
              </button>
            )}
          </div>
        ))}
      </div>
      {share === null ? (
        <button
          type="button"
          disabled={shareBusy}
          onClick={() => void makeShare()}
          className={btn.quiet}
        >
          {shareBusy ? "Sharing…" : "Share with a client"}
        </button>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm break-all">{share.url}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyLink()}
              className={btn.quiet}
            >
              Copy link
            </button>
            <Confirm label="Stop sharing" onConfirm={() => void stopSharing()} />
          </div>
        </div>
      )}
      {problem !== "" && <Status tone="bad">{problem}</Status>}
      {copied && <Status tone="ok">Copied.</Status>}
    </div>
  );
}

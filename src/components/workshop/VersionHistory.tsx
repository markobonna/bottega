"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getVersions } from "@/app/projects/[id]/actions";
import { btn, card } from "@/components/ui";
import type { VersionRow } from "@/lib/versions";

// Same shape as the workshop home's timeAgo; that module is a server
// component and can't be imported here.
function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function VersionChip({
  appId,
  version,
}: {
  appId: string;
  version: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<VersionRow[] | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open ]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const r = await getVersions(appId);
      if (r.ok) setRows(r.versions);
    }
  }

  async function goBack(target: number) {
    if (restoring !== null) return;
    setRestoring(target);
    try {
      const res = await fetch("/api/edit/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, version: target }),
      });
      if (res.ok) {
        setOpen(false);
        setRows(null);
        router.refresh();
      }
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div ref={boxRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Version ${version}. Show version history.`}
        onClick={() => void toggle()}
        className="cursor-pointer rounded-full border border-line px-2 py-0.5 text-xs text-muted"
      >
        v{version}
      </button>
      {open && (
        <div className={`${card} absolute top-full right-0 z-30 mt-1 w-64 p-2`}>
          {rows === null ? (
            <p className="px-2 py-1 text-sm text-muted">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="px-2 py-1 text-sm text-muted">No history yet.</p>
          ) : (
            <ul className="flex flex-col">
              {rows.map((r) => (
                <li
                  key={r.version}
                  className="flex items-baseline justify-between gap-2 px-2 py-1 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-semibold">v{r.version}</span>{" "}
                    {r.summary ?? "—"}{" "}
                    <span className="text-muted">{timeAgo(r.created_at)}</span>
                  </span>
                  {r.version === version ? (
                    <span className="text-muted shrink-0 text-xs">current</span>
                  ) : (
                    <button
                      type="button"
                      disabled={restoring !== null}
                      onClick={() => void goBack(r.version)}
                      className={`${btn.quiet} ${btn.small} shrink-0`}
                    >
                      {restoring === r.version ? "…" : "Go back to here"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

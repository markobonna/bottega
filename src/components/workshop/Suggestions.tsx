"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { btn, Label, Status } from "@/components/ui";
import type { Op } from "@/lib/spec/ops";
import DiffPreview, { type PreviewDiff } from "./DiffPreview";

interface Suggestion {
  title: string;
  why: string;
  ops: Op[];
  preview: PreviewDiff;
}

function readCache(key: string): Suggestion[] | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { suggestions?: unknown };
    return Array.isArray(parsed.suggestions)
      ? (parsed.suggestions as Suggestion[])
      : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, suggestions: Suggestion[]) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ suggestions }));
  } catch {
    // Private mode: fetch fresh on each mount instead.
  }
}

export default function Suggestions({
  appId,
  version,
}: {
  appId: string;
  version: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    let live = true;
    const key = `suggest:${appId}:${version}`;
    const cached = readCache(key);
    if (cached) {
      setItems(cached);
      return;
    }
    (async () => {
      let res: Response;
      try {
        res = await fetch("/api/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appId }),
        });
      } catch {
        if (live) setItems([]);
        return;
      }
      if (!res.ok) {
        if (live) setItems([]);
        return;
      }
      const data = (await res.json()) as { suggestions: Suggestion[] };
      if (!live) return;
      setItems(data.suggestions);
      writeCache(key, data.suggestions);
    })();
    return () => {
      live = false;
    };
  }, [appId, version]);

  async function accept(s: Suggestion) {
    if (accepting) return;
    setAccepting(true);
    setProblem("");
    try {
      const res = await fetch("/api/edit/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId,
          ops: s.ops,
          summary: `${s.title} — ${s.why}`,
          baseVersion: version,
          source: "suggest",
        }),
      });
      if (res.status === 409) {
        setProblem("Your app changed; these ideas are stale.");
        return;
      }
      if (!res.ok) {
        setProblem("Couldn't save. Try again.");
        return;
      }
      setItems(null);
      setOpen(null);
      router.refresh();
    } finally {
      setAccepting(false);
    }
  }

  if (items === null || items.length === 0) return null;
  const current = open !== null ? items[open] : undefined;

  return (
    <section aria-label="Ideas for your app" className="flex flex-col gap-2">
      <Label>Ideas for your app</Label>
      <div className="flex flex-col gap-2">
        {items.map((s, i) => (
          <button
            key={i}
            type="button"
            aria-expanded={open === i}
            onClick={() => {
              setOpen(open === i ? null : i);
              setProblem("");
            }}
            className={btn.quiet}
          >
            <span className="flex flex-col items-start gap-0.5 text-left">
              <span className="font-semibold">{s.title}</span>
              <span className="text-sm font-normal text-muted">{s.why}</span>
            </span>
          </button>
        ))}
      </div>
      {current !== undefined && (
        <DiffPreview
          summary={current.title}
          preview={current.preview}
          busy={accepting}
          onAccept={() => void accept(current)}
          onDiscard={() => setOpen(null)}
        />
      )}
      {problem !== "" && <Status tone="bad">{problem}</Status>}
    </section>
  );
}

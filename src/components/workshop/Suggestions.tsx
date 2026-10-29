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

function readCache(key: string): {
  suggestions: Suggestion[];
  answeredBy?: string;
} | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      suggestions?: unknown;
      answeredBy?: unknown;
    };
    if (!Array.isArray(parsed.suggestions)) return null;
    return {
      suggestions: parsed.suggestions as Suggestion[],
      answeredBy:
        typeof parsed.answeredBy === "string" ? parsed.answeredBy : undefined,
    };
  } catch {
    return null;
  }
}

function writeCache(
  key: string,
  suggestions: Suggestion[],
  answeredBy?: string,
) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ suggestions, answeredBy }));
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
  const [answeredBy, setAnsweredBy] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState<number | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    let live = true;
    const key = `suggest:${appId}:${version}`;
    const cached = readCache(key);
    if (cached) {
      setItems(cached.suggestions);
      setAnsweredBy(cached.answeredBy);
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
      const data = (await res.json()) as {
        suggestions: Suggestion[];
        answeredBy?: string;
      };
      if (!live) return;
      setItems(data.suggestions);
      setAnsweredBy(data.answeredBy);
      writeCache(key, data.suggestions, data.answeredBy);
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
        setProblem("Project changed; these ideas are stale.");
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
    <section aria-label="Ideas for your project" className="flex flex-col gap-2">
      <Label>Ideas for your project</Label>
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
          answeredBy={answeredBy}
          onAccept={() => void accept(current)}
          onDiscard={() => setOpen(null)}
        />
      )}
      {problem !== "" && <Status tone="bad">{problem}</Status>}
    </section>
  );
}

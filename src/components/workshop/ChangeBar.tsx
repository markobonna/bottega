"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { btn, card, DataNotice, Status } from "@/components/ui";
import type { Op } from "@/lib/spec/ops";
import { inputCls } from "../blocks/Form";
import DiffPreview, { type PreviewDiff } from "./DiffPreview";

type Phase = "idle" | "working" | "preview";

interface EditReply {
  summary: string;
  ops: Op[];
  baseVersion: number;
  preview: PreviewDiff;
  answeredBy?: string;
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

export default function ChangeBar({ appId }: { appId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [edit, setEdit] = useState<EditReply | null>(null);
  const [problem, setProblem] = useState("");
  const [keyOff, setKeyOff] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [toast, setToast] = useState<number | null>(null);
  const [undone, setUndone] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function laterToast(fn: () => void, ms: number) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(fn, ms);
  }

  async function submit() {
    const request = text.trim();
    if (request.length < 3 || phase !== "idle") return;
    setPhase("working");
    setProblem("");
    setEdit(null);
    let res: Response;
    try {
      res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, request }),
      });
    } catch {
      setProblem("The model didn't answer. Try again.");
      setPhase("idle");
      return;
    }
    if (res.status === 503) {
      setKeyOff(true);
      setPhase("idle");
      return;
    }
    if (!res.ok) {
      setProblem(await readError(res, "The model didn't answer. Try again."));
      setPhase("idle");
      return;
    }
    setEdit((await res.json()) as EditReply);
    setPhase("preview");
  }

  async function accept() {
    if (!edit || accepting) return;
    setAccepting(true);
    setProblem("");
    let res: Response;
    try {
      res = await fetch("/api/edit/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId,
          ops: edit.ops,
          summary: edit.summary,
          baseVersion: edit.baseVersion,
        }),
      });
    } catch {
      setProblem("Couldn't save. Try again.");
      setAccepting(false);
      return;
    }
    if (res.status === 409) {
      setProblem("Project changed while you were asking. Try again.");
      setEdit(null);
      setPhase("idle");
      setAccepting(false);
      router.refresh();
      return;
    }
    if (!res.ok) {
      setProblem(await readError(res, "Couldn't save. Try again."));
      setAccepting(false);
      return;
    }
    const data = (await res.json()) as { version: number };
    setToast(data.version);
    setUndone(false);
    setEdit(null);
    setPhase("idle");
    setText("");
    setAccepting(false);
    router.refresh();
    laterToast(() => setToast(null), 10000);
  }

  async function undo() {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    let res: Response;
    try {
      res = await fetch("/api/edit/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId }),
      });
    } catch {
      setToast(null);
      setProblem("Couldn't undo. Try again.");
      return;
    }
    if (!res.ok) {
      setToast(null);
      setProblem(await readError(res, "Couldn't undo. Try again."));
      return;
    }
    setUndone(true);
    router.refresh();
    laterToast(() => {
      setToast(null);
      setUndone(false);
    }, 4000);
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(72px+var(--talk-h,0px)+env(safe-area-inset-bottom))] z-10 sm:bottom-[var(--talk-h,0px)]">
      <div className="gutter mx-auto flex max-w-[720px] flex-col gap-2 border-t border-line bg-paper pt-2 pb-2">
        {toast !== null && (
          <div role="status" className={`${card} flex items-center gap-3 p-3`}>
            {undone ? (
              <p>Undone.</p>
            ) : (
              <>
                <p className="flex-1">Updated to v{toast}.</p>
                <button
                  type="button"
                  onClick={() => void undo()}
                  className={`${btn.quiet} ${btn.small}`}
                >
                  Undo
                </button>
              </>
            )}
          </div>
        )}
        {phase === "preview" && edit !== null && (
          <DiffPreview
            summary={edit.summary}
            preview={edit.preview}
            busy={accepting}
            answeredBy={edit.answeredBy}
            onAccept={() => void accept()}
            onDiscard={() => {
              setEdit(null);
              setPhase("idle");
            }}
          />
        )}
        {keyOff ? (
          <Status tone="muted">
            Changes are off right now (no model key).
          </Status>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              aria-label="Ask Bottega to change this project"
              placeholder="Ask for a change…"
              value={text}
              disabled={phase !== "idle"}
              onChange={(e) => setText(e.target.value)}
              className={`${inputCls} min-w-0 flex-1`}
            />
            <button
              type="submit"
              disabled={phase !== "idle" || text.trim().length < 3}
              className={btn.primary}
            >
              Change
            </button>
          </form>
        )}
        {phase === "working" && <Status tone="muted">Working on it…</Status>}
        {problem !== "" && <Status tone="bad">{problem}</Status>}
        <DataNotice />
      </div>
    </div>
  );
}

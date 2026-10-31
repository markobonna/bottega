"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { btn, card, Status } from "@/components/ui";
import type { AskEdit } from "@/lib/apprentice-client";
import type { Op } from "@/lib/spec/ops";
import DiffPreview from "./DiffPreview";

interface EditReply extends AskEdit {
  ops: Op[];
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

// Review strip for changes proposed in the talk bar. It renders nothing until
// an edit arrives, then offers Accept / Discard plus the undo toast.
export default function ChangeBar({ appId }: { appId: string }) {
  const router = useRouter();
  const [edit, setEdit] = useState<EditReply | null>(null);
  const [problem, setProblem] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [toast, setToast] = useState<number | null>(null);
  const [undone, setUndone] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const onEdit = (e: Event) => {
      const { appId: forApp, edit: incoming } = (e as CustomEvent).detail as {
        appId: string;
        edit: EditReply;
      };
      if (forApp !== appId) return;
      setProblem("");
      setToast(null);
      setEdit(incoming);
    };
    window.addEventListener("bottega:edit", onEdit);
    return () => window.removeEventListener("bottega:edit", onEdit);
  }, [appId]);

  function laterToast(fn: () => void, ms: number) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(fn, ms);
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

  if (edit === null && toast === null && problem === "") return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(72px+var(--talk-h,0px)+env(safe-area-inset-bottom))] z-10 sm:bottom-[var(--talk-h,0px)]">
      <div className="gutter mx-auto flex max-w-[1180px] flex-col gap-2 border-t border-line bg-paper pt-2 pb-2">
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
        {edit !== null && (
          <DiffPreview
            summary={edit.summary}
            preview={edit.preview}
            busy={accepting}
            answeredBy={edit.answeredBy}
            onAccept={() => void accept()}
            onDiscard={() => setEdit(null)}
          />
        )}
        {problem !== "" && <Status tone="bad">{problem}</Status>}
      </div>
    </div>
  );
}

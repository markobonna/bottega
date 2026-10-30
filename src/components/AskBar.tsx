"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { card, Status } from "@/components/ui";
import type { DesignMedium } from "@/lib/design/project-art";
import { useRecorder } from "@/lib/wav";

interface Turn {
  role: "user" | "assistant";
  text: string;
}

interface AskReply {
  say?: string;
  navigate?: string;
  build?: {
    workshopId: string;
    description: string;
    kind: DesignMedium;
  };
  error?: string;
}

function contextFromLocation(pathname: string): {
  appId?: string;
  workshopId?: string;
} {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "projects" && parts[1]) return { appId: parts[1] };
  if (parts[0] === "workshops" && parts[1]) return { workshopId: parts[1] };
  if (parts[0] === "new") {
    const q = new URLSearchParams(window.location.search).get("workshop");
    if (q) return { workshopId: q };
  }
  return {};
}

export default function AskBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyNote, setBusyNote] = useState("");
  const [problem, setProblem] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  async function ask(message: string, prior: Turn[]) {
    setBusy(true);
    setBusyNote("Thinking…");
    setProblem("");
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: prior.slice(-6),
          context: contextFromLocation(pathname),
        }),
      });
      if (res.status === 503) {
        setProblem("Ask is off right now (no model key).");
        return;
      }
      const data = (await res.json()) as AskReply;
      if (!res.ok) {
        setProblem(data.error ?? "The model didn't answer. Try again.");
        return;
      }
      const next: Turn[] = [
        ...prior,
        { role: "user", text: message },
        { role: "assistant", text: data.say ?? "" },
      ];
      setTurns(next);
      if (data.navigate) {
        router.push(data.navigate);
        setOpen(false);
        setTurns([]);
        return;
      }
      if (data.build) {
        setBusyNote("Building your project…");
        const b = await fetch("/api/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: data.build.description,
            workshopId: data.build.workshopId,
            kind: data.build.kind,
          }),
        });
        const built = (await b.json()) as {
          appId?: string;
          error?: string;
        };
        if (!b.ok || !built.appId) {
          setProblem(built.error ?? "Couldn't build that. Try again.");
          return;
        }
        router.push(`/projects/${built.appId}`);
        setOpen(false);
        setTurns([]);
        return;
      }
    } catch {
      setProblem("The model didn't answer. Try again.");
    } finally {
      setBusy(false);
      setBusyNote("");
    }
  }

  function submit() {
    const message = text.trim().slice(0, 500);
    if (!message || busy) return;
    setText("");
    setOpen(true);
    void ask(message, turns);
  }

  const mic = useRecorder({
    onBlob: (blob) =>
      void (async () => {
        const form = new FormData();
        form.append("audio", blob, "audio.wav");
        try {
          const res = await fetch("/api/hear", {
            method: "POST",
            body: form,
          });
          if (!res.ok) {
            setOpen(true);
            setProblem(
              res.status === 503
                ? "Voice is off right now (no model key). Type it instead."
                : "Couldn't hear that. Try again.",
            );
            return;
          }
          const data = (await res.json()) as { transcript: string };
          if (!data.transcript.trim()) return;
          setOpen(true);
          void ask(data.transcript.trim().slice(0, 500), turns);
        } catch {
          setOpen(true);
          setProblem("Couldn't hear that. Try again.");
        }
      })(),
    onDenied: () => {
      setOpen(true);
      setProblem(
        "Bottega can't hear you: allow the microphone in your browser settings.",
      );
    },
    onFailed: () => {
      setOpen(true);
      setProblem("Couldn't hear that. Try again.");
    },
  });

  return (
    <div ref={boxRef} className="relative min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <form
          className="min-w-0 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            type="text"
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => turns.length > 0 && setOpen(true)}
            placeholder="Ask Bottega…"
            aria-label="Ask Bottega"
            className="h-10 w-full rounded-full border-[1.5px] border-line bg-card px-4 text-sm text-ink placeholder:text-muted"
          />
        </form>
        <button
          type="button"
          disabled={busy}
          {...mic.handlers}
          aria-label={mic.recording ? "Stop listening" : "Talk to Bottega"}
          aria-pressed={mic.recording}
          title="Talk to Bottega"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-xl text-paper disabled:opacity-50"
        >
          {mic.recording ? `${mic.secs}s` : "🎙"}
        </button>
      </div>
      {open && (
        <div
          role="dialog"
          aria-label="Bottega answers"
          className={`${card} absolute right-0 left-0 z-30 mt-2 flex max-h-80 flex-col gap-2 overflow-y-auto p-3 sm:right-auto sm:left-1/2 sm:w-96 sm:-translate-x-1/2`}
        >
          {turns.length === 0 && !busy && problem === "" && (
            <p className="text-sm text-muted">
              Try “make me a bakery”, “open the garage”, or “build an oven
              tracker”.
            </p>
          )}
          {turns.map((t, i) => (
            <p
              key={i}
              className={`text-sm ${t.role === "user" ? "font-semibold" : "text-muted"}`}
            >
              {t.role === "user" ? "You: " : ""}
              {t.text}
            </p>
          ))}
          {busy && <Status tone="muted">{busyNote}</Status>}
          {problem !== "" && <Status tone="bad">{problem}</Status>}
        </div>
      )}
    </div>
  );
}

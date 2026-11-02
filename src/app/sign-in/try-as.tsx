"use client";

import { useEffect, useState } from "react";
import { Status } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";

const CARDS = [
  {
    who: "maria",
    photo: "/demo/maria.jpg",
    alt: "Maria in her home office",
    title: "Try as Maria",
    blurb: "Runs a bakery café.",
    rooms: "Café · Dance Studio · Music Room",
    accent: "terracotta",
  },
  {
    who: "cole",
    photo: "/demo/cole.jpg",
    alt: "Cole in his workshop office",
    title: "Try as Cole",
    blurb: "Restores furniture.",
    rooms: "Store · Garage · Kitchen",
    accent: "olive",
  },
] as const;

export default function TryAs() {
  const [busy, setBusy] = useState<"maria" | "cole" | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!busy) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function go(who: "maria" | "cole") {
    if (busy) return;
    setBusy(who);
    setProblem("");
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) await supabase.auth.signOut();
      const { error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) {
        setProblem(anonError.message);
        setBusy(null);
        return;
      }
      const res = await fetch("/api/try-as", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ who }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setProblem(data?.error ?? "Couldn't set up the demo. Try again.");
        setBusy(null);
        return;
      }
      // Full reload: the root layout (header + talk bar) only renders
      // on a fresh navigation, not a client-side push.
      window.location.href = "/";
    } catch {
      setProblem("Couldn't set up the demo. Try again.");
      setBusy(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="border-t-[1.5px] border-line pt-4">
        <p className="text-center text-sm text-muted">
          Try a guest Bottega before creating your own from scratch
        </p>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CARDS.map((c) => (
          <button
            key={c.who}
            type="button"
            disabled={busy !== null}
            onClick={() => void go(c.who)}
            data-accent={c.accent}
            className="overflow-hidden rounded-2xl border-[1.5px] border-line bg-card text-left transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <span className="block h-1.5 bg-accent" aria-hidden="true" />
            <span className="flex items-center gap-4 p-4">
              <img
                src={c.photo}
                alt={c.alt}
                width={168}
                height={168}
                style={{ width: 168, height: 168, borderRadius: 36 }}
                className="shrink-0 object-cover object-top"
              />
              <span className="min-w-0 flex-1 text-center">
                <span className="block font-display text-6xl leading-tight">
                  {busy === c.who ? "Setting up…" : c.title}
                </span>
                <span className="mt-1 block text-sm text-muted">
                  {c.blurb}
                </span>
                <span className="mt-1.5 block text-sm">{c.rooms}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
      {busy !== null && (
        <Status tone="muted">
          {elapsed < 15
            ? `Setting up your copy… ${15 - elapsed}s`
            : "Almost there…"}
        </Status>
      )}
      {problem !== "" && <Status tone="bad">{problem}</Status>}
    </div>
  );
}

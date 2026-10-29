"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btn, Status } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";

export default function TryAs() {
  const router = useRouter();
  const [busy, setBusy] = useState<"maria" | "cole" | null>(null);
  const [problem, setProblem] = useState("");

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
      const { appId } = (await res.json()) as { appId: string };
      router.push(`/apps/${appId}`);
    } catch {
      setProblem("Couldn't set up the demo. Try again.");
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void go("maria")}
        className={`${btn.quiet} w-full`}
      >
        {busy === "maria" ? "Setting up…" : "Try as Maria"}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void go("cole")}
        className={`${btn.quiet} w-full`}
      >
        {busy === "cole" ? "Setting up…" : "Try as Cole"}
      </button>
      {problem !== "" && <Status tone="bad">{problem}</Status>}
    </div>
  );
}

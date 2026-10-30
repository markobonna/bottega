"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btn, Status } from "@/components/ui";

export default function ProjectBuildButton({ appId }: { appId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [off, setOff] = useState(false);
  const [problem, setProblem] = useState("");

  async function build() {
    if (busy) return;
    setBusy(true);
    setProblem("");
    try {
      const res = await fetch("/api/project-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId }),
      });
      if (res.status === 503) {
        setOff(true);
        return;
      }
      if (!res.ok) {
        setProblem("The model didn't answer. Try again.");
        return;
      }
      router.refresh();
    } catch {
      setProblem("The model didn't answer. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (off) {
    return (
      <p className="text-sm text-muted">
        Pictures are off right now (no model key).
      </p>
    );
  }
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void build()}
        className={`${btn.quiet} ${btn.small}`}
      >
        {busy ? "Building…" : "Build"}
      </button>
      {problem !== "" && <Status tone="bad">{problem}</Status>}
    </span>
  );
}

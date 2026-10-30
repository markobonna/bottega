"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setKind, setPrivate } from "@/app/projects/[id]/actions";
import { btn, card, Label, Status } from "@/components/ui";
import type { AppSpec } from "@/lib/spec/schema";

const META_USE: Record<string, string> = {
  see: "Seeing",
  draw: "Drawing",
  hear: "Voice transcription",
};

export default function SettingsSheet({
  appId,
  initialPriv,
  initialKind,
  spec,
}: {
  appId: string;
  initialPriv: boolean;
  initialKind: "software" | "hardware";
  spec: AppSpec;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [priv, setPriv] = useState(initialPriv);
  const [kind, setKindState] = useState(initialKind);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
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
  }, [open]);

  async function toggle() {
    if (saving) return;
    setSaving(true);
    setProblem("");
    const res = await setPrivate(appId, !priv);
    setSaving(false);
    if (!res.ok) {
      setProblem("Couldn't save. Try again.");
      return;
    }
    setPriv(res.priv);
    router.refresh();
  }

  async function pickKind(next: "software" | "hardware") {
    if (saving || next === kind) return;
    setSaving(true);
    setProblem("");
    const res = await setKind(appId, next);
    setSaving(false);
    if (!res.ok) {
      setProblem("Couldn't save. Try again.");
      return;
    }
    setKindState(res.kind);
    router.refresh();
  }

  const metaBlocks = spec.screens.flatMap((s) =>
    s.blocks.filter((b) => b.type in META_USE),
  );

  return (
    <div ref={sheetRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Project settings"
        onClick={() => setOpen((v) => !v)}
        className={`${btn.quiet} ${btn.small}`}
      >
        ⚙️
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Project settings"
          className={`${card} absolute right-0 z-30 mt-2 flex w-72 flex-col gap-2 p-3`}
        >
          <Label>Private mode</Label>
          <button
            type="button"
            aria-pressed={priv}
            disabled={saving}
            onClick={() => void toggle()}
            className={btn.quiet}
          >
            {saving ? "Saving…" : priv ? "On" : "Off"}
          </button>
          <p className="text-sm text-muted">
            Building and changing your project, and filling in forms from your
            voice, run on Meta&apos;s open-weight models that we host
            ourselves, not on Meta&apos;s API. Seeing, drawing and transcribing
            still use Meta&apos;s models.
          </p>
          <Label>Project kind</Label>
          <div className="flex gap-2" role="group" aria-label="Project kind">
            {(["software", "hardware"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                disabled={saving}
                onClick={() => void pickKind(k)}
                className={`${btn.quiet} ${btn.small} capitalize`}
              >
                {k}
              </button>
            ))}
          </div>
          <Label>Still uses Meta&apos;s API</Label>
          {metaBlocks.length === 0 ? (
            <p className="text-sm text-muted">
              None of this project&apos;s blocks use Meta&apos;s API.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {metaBlocks.map((b) => (
                <li key={b.id}>
                  {META_USE[b.type]} — {b.title}
                </li>
              ))}
            </ul>
          )}
          {problem !== "" && <Status tone="bad">{problem}</Status>}
        </div>
      )}
    </div>
  );
}

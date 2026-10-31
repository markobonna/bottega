"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameWorkshop } from "@/app/actions";
import { btn, Status } from "@/components/ui";

export default function RenameWorkshop({
  workshopId,
  initial,
}: {
  workshopId: string;
  initial: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");

  async function save() {
    const clean = name.trim();
    if (!clean || saving) return;
    setSaving(true);
    setProblem("");
    try {
      await renameWorkshop(workshopId, clean);
      setEditing(false);
      router.refresh();
    } catch {
      setProblem("Couldn't rename. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setName(initial);
          setProblem("");
          setEditing(true);
        }}
        className={`${btn.quiet} ${btn.small}`}
      >
        Rename
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        aria-label="Workshop name"
        value={name}
        maxLength={40}
        autoFocus
        disabled={saving}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") setEditing(false);
        }}
        className="min-w-0 flex-1 rounded-[6px] border-[1.5px] border-ink bg-card px-3 py-1.5"
      />
      <button
        type="button"
        disabled={saving || !name.trim()}
        onClick={() => void save()}
        className={`${btn.primary} ${btn.small}`}
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => setEditing(false)}
        className={`${btn.quiet} ${btn.small}`}
      >
        Cancel
      </button>
      {problem !== "" && <Status tone="bad">{problem}</Status>}
    </span>
  );
}

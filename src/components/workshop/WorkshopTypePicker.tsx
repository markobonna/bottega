"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setWorkshopType } from "@/app/actions";
import { btn, Label, Status } from "@/components/ui";
import { WORKSHOP_TYPE_OPTIONS } from "@/lib/design/workshop-types";

export default function WorkshopTypePicker({
  workshopId,
  initial,
}: {
  workshopId: string;
  initial: string;
}) {
  const router = useRouter();
  const [type, setType] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");

  async function pick(next: string) {
    if (saving || next === type) return;
    setSaving(true);
    setProblem("");
    try {
      await setWorkshopType(workshopId, next);
      setType(next);
      router.refresh();
    } catch {
      setProblem("Couldn't change it. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>What kind of place is it?</Label>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Workshop type">
        {WORKSHOP_TYPE_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={type === o.id}
            disabled={saving}
            onClick={() => void pick(o.id)}
            className={`${btn.quiet} ${btn.small}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {problem !== "" && <Status tone="bad">{problem}</Status>}
    </div>
  );
}

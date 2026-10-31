"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { moveProject } from "@/app/projects/[id]/actions";
import { btn } from "@/components/ui";

export default function ProjectMoveButtons({
  appId,
  isFirst,
  isLast,
}: {
  appId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function move(dir: -1 | 1) {
    if (busy) return;
    setBusy(true);
    const res = await moveProject(appId, dir);
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <span className="flex gap-1" role="group" aria-label="Move project">
      <button
        type="button"
        aria-label="Move earlier"
        title="Move earlier"
        disabled={busy || isFirst}
        onClick={() => void move(-1)}
        className={`${btn.quiet} ${btn.small}`}
      >
        ↑
      </button>
      <button
        type="button"
        aria-label="Move later"
        title="Move later"
        disabled={busy || isLast}
        onClick={() => void move(1)}
        className={`${btn.quiet} ${btn.small}`}
      >
        ↓
      </button>
    </span>
  );
}

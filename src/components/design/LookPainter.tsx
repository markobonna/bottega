"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Paints a project's portrait automatically in the background: fires POST
 * /api/project-look once per project (guarded by sessionStorage so the
 * reveal screen and the project page never double-fire). The sketch is
 * already on screen; this never blocks it and shows no timer, so a slow
 * render never reads as stuck. Renders nothing when the portrait exists.
 */
export default function LookPainter({
  appId,
  lookMissing,
}: {
  appId: string;
  lookMissing: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"busy" | "done" | "failed" | "off" | null>(
    null,
  );
  const [attempt, setAttempt] = useState(0);
  const firing = useRef(false);

  useEffect(() => {
    if (!lookMissing || firing.current) return;
    const flag = `bottega:look-${appId}`;
    try {
      if (attempt === 0 && sessionStorage.getItem(flag)) return;
      sessionStorage.setItem(flag, "1");
    } catch {
      return;
    }
    firing.current = true;
    setPhase("busy");
    (async () => {
      try {
        const res = await fetch("/api/project-look", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appId }),
        });
        if (res.status === 503) {
          setPhase("off");
          return;
        }
        if (!res.ok) throw new Error("render failed");
        setPhase("done");
        router.refresh();
      } catch {
        setPhase("failed");
      } finally {
        firing.current = false;
      }
    })();
  }, [appId, lookMissing, attempt, router]);

  if (!lookMissing || phase === null) return null;

  if (phase === "busy") {
    return (
      <p className="text-muted text-sm" role="status" aria-live="polite">
        Painting your portrait in the background — keep working, it&apos;ll
        pop in when it&apos;s done.
      </p>
    );
  }
  if (phase === "done") {
    return (
      <p className="text-muted text-sm" role="status">
        Portrait&apos;s up on your workshop wall.
      </p>
    );
  }
  if (phase === "failed") {
    return (
      <p className="text-sm" role="status">
        The portrait didn&apos;t paint.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => {
            try {
              sessionStorage.removeItem(`bottega:look-${appId}`);
            } catch {
              /* private mode: retry once anyway */
            }
            setAttempt((a) => a + 1);
          }}
        >
          Try again
        </button>
      </p>
    );
  }
  return (
    <p className="text-muted text-sm">
      Portraits are off right now (no model key).
    </p>
  );
}

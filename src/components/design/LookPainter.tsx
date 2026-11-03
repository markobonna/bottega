"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Paints a project's art automatically in the background: first the B&W
 * sketch (POST /api/project-look), then the color portrait grown out of
 * it (POST /api/project-portrait), with a refresh between so each pops
 * in when ready. Guarded per stage by sessionStorage so a refresh never
 * double-fires. Shows no timer, so a slow render never reads as stuck.
 * Renders nothing when both exist.
 */
export default function LookPainter({
  appId,
  sketchMissing,
  lookMissing,
  onPhase,
  signal = 0,
}: {
  appId: string;
  sketchMissing: boolean;
  lookMissing: boolean;
  onPhase?: (phase: "off" | "failed" | null) => void;
  /** Bump to re-attempt still-missing art (e.g. stepping forward again). */
  signal?: number;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<
    "sketch" | "portrait" | "done" | "failed" | "off" | null
  >(null);
  const [attempt, setAttempt] = useState(0);
  const firing = useRef(false);

  useEffect(() => {
    if ((!sketchMissing && !lookMissing) || firing.current) return;
    const sketchFlag = `bottega:sketch-${appId}`;
    const portraitFlag = `bottega:portrait-${appId}`;
    let wantSketch = sketchMissing;
    let wantPortrait = lookMissing;
    try {
      if (attempt === 0) {
        if (sessionStorage.getItem(sketchFlag)) wantSketch = false;
        if (sessionStorage.getItem(portraitFlag)) wantPortrait = false;
      }
      if (!wantSketch && !wantPortrait) return;
    } catch {
      return;
    }
    firing.current = true;
    (async () => {
      try {
        if (wantSketch) {
          try {
            sessionStorage.setItem(sketchFlag, "1");
          } catch {
            /* private mode: fire once anyway */
          }
          setPhase("sketch");
          const res = await fetch("/api/project-look", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appId }),
          });
          if (res.status === 503) {
            setPhase("off");
            return;
          }
          if (!res.ok) throw new Error("sketch failed");
          router.refresh();
        }
        if (wantPortrait) {
          try {
            sessionStorage.setItem(portraitFlag, "1");
          } catch {
            /* private mode: fire once anyway */
          }
          setPhase("portrait");
          const res = await fetch("/api/project-portrait", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appId }),
          });
          if (res.status === 503) {
            setPhase("off");
            return;
          }
          if (!res.ok) throw new Error("portrait failed");
          router.refresh();
        }
        setPhase("done");
      } catch {
        setPhase("failed");
      } finally {
        firing.current = false;
      }
    })();
  }, [appId, sketchMissing, lookMissing, attempt, signal, router]);

  // Tell the board when art will never arrive (no key, or a failed
  // render), so it can fall back to the template drawing. Any other
  // phase — including a retry in flight — reports null.
  useEffect(() => {
    onPhase?.(phase === "off" || phase === "failed" ? phase : null);
  }, [phase, onPhase]);

  function retry() {
    try {
      sessionStorage.removeItem(`bottega:sketch-${appId}`);
      sessionStorage.removeItem(`bottega:portrait-${appId}`);
    } catch {
      /* private mode: retry once anyway */
    }
    setAttempt((a) => a + 1);
  }

  if ((!sketchMissing && !lookMissing) || phase === null) return null;

  if (phase === "sketch" || phase === "portrait") {
    return (
      <p className="text-muted text-sm" role="status" aria-live="polite">
        {phase === "sketch"
          ? "Sketching your project in the background — keep working, it'll pop in when it's done."
          : "Painting the color render from the sketch — keep working, it'll pop in when it's done."}
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
        The art didn&apos;t paint.{" "}
        <button type="button" className="underline" onClick={retry}>
          Try again
        </button>
      </p>
    );
  }
  return (
    <p className="text-muted text-sm">
      Sketching is off right now (no model key).
    </p>
  );
}

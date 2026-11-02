"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * What the board shows while generated art is on its way: a 30-second
 * countdown, then a holding line. Every 5 seconds it re-checks the
 * server, so art that lands early swaps in immediately instead of
 * making the user wait out the clock. The template drawing only ever
 * appears when art was proven unavailable, never as a loading flash.
 */
const KIND_CONFIG = {
  Sketch: { seconds: 30, line: "seconds · Muse Image is drawing your project" },
  Render: { seconds: 30, line: "seconds · Muse Image is drawing your project" },
  Design: { seconds: 120, line: "seconds · Muse Spark is designing your app" },
  Prototype: { seconds: 120, line: "seconds · Muse Spark is wiring up your prototype" },
} as const;

export default function SketchPending({
  kind,
}: {
  kind: "Sketch" | "Render" | "Design" | "Prototype";
}) {
  const router = useRouter();
  const [left, setLeft] = useState<number>(KIND_CONFIG[kind].seconds);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (expired) return;
    if (left <= 0) {
      setExpired(true);
      router.refresh();
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, expired, router]);

  // Re-check the server every 5s: landed art swaps in early, and the
  // countdown unmounts with this component when it does.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div
      role="status"
      aria-label={`${kind} is being created`}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
      }}
    >
      <p className="hand" style={{ fontSize: 30, margin: 0 }}>
        {kind} Being Created
      </p>
      {expired ? (
        <p className="small" style={{ margin: 0 }}>
          Still {kind.toLowerCase()}ing — almost there.
        </p>
      ) : (
        <>
          <p
            aria-hidden="true"
            className="font-display"
            style={{ fontSize: 56, margin: 0, lineHeight: 1 }}
          >
            {left}
          </p>
          <p className="small" style={{ margin: 0 }}>
            {KIND_CONFIG[kind].line}
          </p>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";

// Depth-aware mount animation: deeper than the last page zooms in,
// shallower zooms out. First visit stays still.
export default function ZoomMount({
  depth,
  children,
}: {
  depth: number;
  children: ReactNode;
}) {
  const [cls, setCls] = useState("");
  useEffect(() => {
    let prev: string | null = null;
    try {
      prev = sessionStorage.getItem("b-depth");
      sessionStorage.setItem("b-depth", String(depth));
    } catch {
      // Private mode: no animation memory, still render.
    }
    if (prev === null) return;
    const p = Number(prev);
    if (Number.isNaN(p) || p === depth) return;
    setCls(p < depth ? "b-zoom-in" : "b-zoom-out");
  }, [depth]);
  return <div className={cls}>{children}</div>;
}

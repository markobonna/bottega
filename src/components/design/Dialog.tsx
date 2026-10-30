"use client";

import { useEffect, type ReactNode } from "react";

export function BIcon({ svg }: { svg: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ display: "inline-flex", flex: "none" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function Dialog({
  labelledBy,
  onClose,
  wide,
  cls,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  wide?: boolean;
  cls?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="b-scope">
      <div
        className="backdrop"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={`dialog${wide ? " wide" : ""}${cls ? ` ${cls}` : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

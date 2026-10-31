"use client";

import { useState, type ReactNode } from "react";

// Shared primitives. All color comes from globals.css tokens.

const labelCls =
  "block text-[13px] font-bold uppercase tracking-[0.14em] text-muted";

export function Label({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className={labelCls}>
        {children}
      </label>
    );
  }
  return <span className={labelCls}>{children}</span>;
}

const btnBase =
  "inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-[6px] border-[1.5px] px-[18px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const btn = {
  primary: `${btnBase} border-accent bg-accent text-accent-ink`,
  quiet: `${btnBase} border-ink bg-card text-ink aria-pressed:bg-ink aria-pressed:text-paper`,
  // Trailing `!` so small wins over the variant's own padding when composed.
  small: "min-h-[36px]! px-3! py-1.5! text-sm!",
};

export const card =
  "rounded-[6px] border-[1.5px] border-ink bg-card shadow-[4px_4px_0_rgba(51,38,26,0.15)]";

const statusTone = {
  ok: "text-ok",
  bad: "text-bad",
  muted: "text-muted",
} as const;

export function Status({
  tone,
  children,
}: {
  tone: "ok" | "bad" | "muted";
  children: ReactNode;
}) {
  if (!children) return null;
  return (
    <p aria-live="polite" className={statusTone[tone]}>
      {children}
    </p>
  );
}

export function DataNotice() {
  return (
    <p className="text-sm text-muted">
      Photos, voice and text you add may be used by Meta to improve its models.
    </p>
  );
}

export function Confirm({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: () => void | Promise<void>;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      className={btn.quiet}
      onClick={() => {
        if (armed) void onConfirm();
        else setArmed(true);
      }}
    >
      {armed ? `Really ${label.toLowerCase()}?` : label}
    </button>
  );
}

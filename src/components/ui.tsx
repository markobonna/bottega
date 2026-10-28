"use client";

import { useState, type ReactNode } from "react";

// Shared primitives. All color comes from globals.css tokens.

const labelCls =
  "block text-[0.72rem] font-bold uppercase tracking-[0.09em] text-muted";

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
  "inline-flex cursor-pointer items-center justify-center gap-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const btn = {
  primary: `${btnBase} rounded-[12px] bg-ink px-5 py-2.5 text-paper`,
  quiet: `${btnBase} rounded-[12px] bg-card px-4 py-2 shadow-[inset_0_0_0_1.5px_var(--line)] aria-pressed:shadow-[inset_0_0_0_2px_var(--ink)]`,
  // Trailing `!` so small wins over the variant's own padding when composed.
  small: "px-3! py-1.5! text-sm!",
};

export const card = "rounded-2xl border-[1.5px] border-line bg-card";

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

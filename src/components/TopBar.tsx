"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";
import Crumbs from "./Crumbs";
import { btn, card } from "./ui";

export default function TopBar({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-line bg-paper">
      <div className="gutter mx-auto flex h-14 max-w-[720px] items-center gap-2">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <svg
            width="26"
            height="26"
            viewBox="0 0 32 32"
            aria-hidden="true"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle
              cx="16"
              cy="6"
              r="3"
              className="stroke-ink"
            />
            <path
              d="M14.5 8.5L7 28M17.5 8.5L25 28"
              className="stroke-ink"
            />
            <path
              d="M5 20a14 14 0 0 0 22 0"
              className="stroke-accent"
            />
          </svg>
          <span className="font-display hidden text-xl min-[420px]:inline">
            Bottega
          </span>
        </Link>
        <Crumbs />
        {email ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={`${btn.quiet} ${btn.small}`}
            >
              {email.charAt(0).toUpperCase()}
            </button>
            {open && (
              <div role="menu" className={`${card} absolute right-0 z-30 mt-2 flex min-w-52 flex-col gap-2 p-3`}>
                <p className="truncate text-sm text-muted">{email}</p>
                <form action={signOut}>
                  <button
                    type="submit"
                    className={`${btn.quiet} ${btn.small} w-full`}
                  >
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        ) : (
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className={`${btn.quiet} ${btn.small}`}
            >
              🚪
            </button>
          </form>
        )}
      </div>
    </header>
  );
}

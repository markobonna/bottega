"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";
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
      <div className="gutter mx-auto flex h-14 max-w-[720px] items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <rect
              x="2"
              y="5"
              width="18"
              height="3.5"
              rx="1"
              className="fill-brass"
            />
            <rect x="4.5" y="8.5" width="2.5" height="9.5" className="fill-ink" />
            <rect x="15" y="8.5" width="2.5" height="9.5" className="fill-ink" />
          </svg>
          <span className="font-display text-xl">Bottega</span>
        </Link>
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

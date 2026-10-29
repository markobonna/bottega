"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { btn, card } from "@/components/ui";
import type { AppSpec, BlockType } from "@/lib/spec/schema";

const BLOCK_ICON: Record<BlockType, string> = {
  list: "📋",
  form: "✏️",
  stat: "📈",
  see: "👁️",
  hear: "🎙️",
  price: "🧾",
  compare: "↔️",
  teach: "🎚️",
  draw: "🎨",
  make: "🪚",
};

export default function BuildReveal({
  appId,
  spec,
  answeredBy,
}: {
  appId: string;
  spec: AppSpec;
  answeredBy?: string;
}) {
  const total =
    1 + spec.screens.reduce((n, s) => n + 1 + s.blocks.length, 0) + 1;
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (visible >= total) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(total);
      return;
    }
    const t = setTimeout(
      () => setVisible((v) => v + 1),
      visible === 0 ? 0 : 180,
    );
    return () => clearTimeout(t);
  }, [visible, total]);

  let at = 0;
  const headerIdx = at++;
  const cards = spec.screens.map((s) => {
    const c = at++;
    const rows = s.blocks.map(() => at++);
    return { c, rows };
  });
  const ctaIdx = at++;

  return (
    <div className="mt-6 flex flex-col gap-3">
      {visible > headerIdx && (
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-4xl">
            {spec.look.icon}
          </span>
          <span className="font-display text-2xl">{spec.name}</span>
        </div>
      )}
      {spec.screens.map(
        (screen, si) =>
          visible > cards[si].c && (
            <div key={screen.id} className={`${card} p-4`}>
              <h2 className="font-display flex items-center gap-2 text-lg">
                <span aria-hidden="true">{screen.icon}</span> {screen.title}
              </h2>
              <ul className="mt-2 flex flex-col gap-1.5">
                {screen.blocks.map(
                  (block, bi) =>
                    visible > cards[si].rows[bi] && (
                      <li key={block.id} className="flex items-center gap-2">
                        <span aria-hidden="true">{BLOCK_ICON[block.type]}</span>
                        <span>{block.title}</span>
                      </li>
                    ),
                )}
              </ul>
            </div>
          ),
      )}
      {visible > ctaIdx && (
        <div className="mt-2 flex flex-col items-stretch gap-2">
          <Link href={`/apps/${appId}`} className={btn.primary}>
            Open my app
          </Link>
          <p className="text-muted text-center text-sm">
            {answeredBy === "muse-spark-open"
              ? "Built with Muse Spark Open from your words."
              : "Built with Muse Spark from your words."}
          </p>
        </div>
      )}
    </div>
  );
}

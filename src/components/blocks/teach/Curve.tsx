"use client";

import { pct } from "@/lib/brain";

// Wrongness curve: fixed 0..50% axis (a fresh brain starts at 50%).

export default function Curve({ curve }: { curve: number[] }) {
  const W = 320;
  const H = 110;
  const left = 4;
  const top = 10;
  const bottom = H - 6;
  const labelRoom = 40;
  const x = (i: number) =>
    curve.length < 2
      ? left
      : left + (i / (curve.length - 1)) * (W - left - labelRoom);
  const y = (v: number) =>
    top + (1 - Math.min(v, 0.5) / 0.5) * (bottom - top);
  const line = curve
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(v)}`)
    .join(" ");
  const last = curve[curve.length - 1];
  return (
    <figure className="mt-2">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={
          curve.length < 2
            ? `Wrongness ${pct(last)}`
            : `Wrongness from ${pct(curve[0])} to ${pct(last)}`
        }
        className="h-auto w-full"
      >
        {curve.length > 1 && (
          <>
            <path
              d={`${line} L${x(curve.length - 1)} ${bottom} L${x(0)} ${bottom} Z`}
              className="fill-accent-soft"
            />
            <path d={line} fill="none" strokeWidth={2} className="stroke-accent" />
          </>
        )}
        <circle
          cx={x(curve.length - 1)}
          cy={y(last)}
          r={3}
          className="fill-accent"
        />
        <text
          x={x(curve.length - 1) + 6}
          y={y(last) + 4}
          fontSize={11}
          className="fill-muted"
        >
          {pct(last)}
        </text>
      </svg>
      <figcaption className="text-sm text-muted">
        How wrong it is, round by round.
      </figcaption>
    </figure>
  );
}

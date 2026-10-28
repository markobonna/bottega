"use client";

import type { DbRecord } from "@/lib/records";
import type { BlockProps } from "../runtime/registry";

function numericValues(records: DbRecord[], field: string): number[] {
  const out: number[] = [];
  for (const r of records) {
    const v = (r.data as Record<string, unknown>)[field];
    if (typeof v === "number" && Number.isFinite(v)) out.push(v);
  }
  return out;
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
}

export default function Stat({ block, spec, records }: BlockProps) {
  if (block.type !== "stat") return null;
  const fieldName =
    spec.collections
      .find((c) => c.id === block.collection)
      ?.fields.find((f) => f.id === block.field)?.name ?? block.field;

  let headline = "—";
  if (block.agg === "count") {
    headline = String(records.length);
  } else {
    const vals = numericValues(records, block.field);
    if (vals.length > 0) {
      if (block.agg === "latest") headline = fmt(vals[0]);
      else if (block.agg === "sum")
        headline = fmt(vals.reduce((a, b) => a + b, 0));
      else headline = fmt(vals.reduce((a, b) => a + b, 0) / vals.length);
    }
  }

  const series =
    block.chart === "line"
      ? numericValues(records.slice(0, 14).reverse(), block.field)
      : [];

  return (
    <div>
      <p className="font-display text-4xl">{headline}</p>
      {series.length > 0 && (
        <LineChart fieldName={fieldName} series={series} />
      )}
    </div>
  );
}

function LineChart({
  fieldName,
  series,
}: {
  fieldName: string;
  series: number[];
}) {
  const W = 320;
  const H = 90;
  const left = 4;
  const top = 10;
  const bottom = H - 6;
  const labelRoom = 30;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const x = (i: number) =>
    series.length < 2
      ? left
      : left + (i / (series.length - 1)) * (W - left - labelRoom);
  const y = (v: number) =>
    max === min ? top + (bottom - top) / 2 : top + (1 - (v - min) / (max - min)) * (bottom - top);
  const line = series.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(v)}`).join(" ");
  const last = series[series.length - 1];
  const label =
    series.length < 2
      ? `${fieldName}, latest ${fmt(last)}`
      : `${fieldName} from ${fmt(series[0])} to ${fmt(last)}`;
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
      className="mt-2 h-auto w-full"
    >
      {series.length > 1 && (
        <>
          <path d={`${line} L${x(series.length - 1)} ${bottom} L${x(0)} ${bottom} Z`} className="fill-accent-soft" />
          <path d={line} fill="none" strokeWidth={2} className="stroke-accent" />
        </>
      )}
      <circle cx={x(series.length - 1)} cy={y(last)} r={3} className="fill-accent" />
      <text x={x(series.length - 1) + 6} y={y(last) + 4} fontSize={11} className="fill-muted">
        {fmt(last)}
      </text>
    </svg>
  );
}

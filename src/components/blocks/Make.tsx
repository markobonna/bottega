"use client";

import { useMemo, useState } from "react";
import { btn, DataNotice, Label, Status } from "@/components/ui";
import {
  clampParams,
  cutList,
  PARAM_LIMITS,
  parts,
  toDxf,
  toStl,
  type Box,
  type ShelfParams,
} from "@/lib/make/shelf";
import type { BlockProps } from "../runtime/registry";
import { inputCls } from "./Form";

type ParamKey = keyof ShelfParams;
const KEYS: ParamKey[] = ["width", "height", "depth", "shelves", "thickness"];

function fmtValue(key: ParamKey, v: number): string {
  if (key === "shelves") return String(v);
  const cm = v / 10;
  return `${v} mm · ${Number.isInteger(cm) ? cm : cm.toFixed(1)} cm`;
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

function ShelfSvg({
  label,
  boxes,
  viewW,
  viewH,
  project,
}: {
  label: string;
  boxes: Box[];
  viewW: number;
  viewH: number;
  project: (b: Box) => { x: number; y: number; w: number; h: number };
}) {
  const s = 240 / Math.max(viewW, viewH);
  const W = Math.ceil(viewW * s) + 30;
  const H = Math.ceil(viewH * s) + 30;
  const ox = 22;
  const oy = 8;
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${label} view, ${viewW} by ${viewH} millimetres`}
        className="w-full"
      >
        {boxes.map((b, i) => {
          const r = project(b);
          return (
            <rect
              key={i}
              x={ox + r.x * s}
              y={oy + r.y * s}
              width={Math.max(1, r.w * s)}
              height={Math.max(1, r.h * s)}
              fill="var(--card)"
              stroke="var(--ink)"
              strokeWidth={1.5}
            />
          );
        })}
        <text
          x={ox + (viewW * s) / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize={11}
          fill="var(--muted)"
        >
          {viewW} mm
        </text>
        <text
          x={10}
          y={oy + (viewH * s) / 2}
          textAnchor="middle"
          fontSize={11}
          fill="var(--muted)"
          transform={`rotate(-90 10 ${oy + (viewH * s) / 2})`}
        >
          {viewH} mm
        </text>
      </svg>
    </div>
  );
}

export default function Make({ block, app }: BlockProps) {
  const [params, setParams] = useState<ShelfParams>(() =>
    clampParams(
      block.type === "make"
        ? block.defaults
        : { width: 900, height: 1200, depth: 300, shelves: 5, thickness: 18 },
    ),
  );
  const [sentence, setSentence] = useState("");
  const [asking, setAsking] = useState(false);
  const [describeOff, setDescribeOff] = useState(false);
  const [problem, setProblem] = useState("");

  const boxes = useMemo(() => parts(params), [params]);
  const rows = useMemo(() => cutList(boxes), [boxes]);

  if (block.type !== "make") return null;

  function set(key: ParamKey, v: number) {
    setParams((p) => ({ ...p, [key]: v }));
  }

  async function describe() {
    const text = sentence.trim();
    if (text.length < 5 || asking) return;
    setAsking(true);
    setProblem("");
    try {
      const res = await fetch("/api/make", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence: text }),
      });
      if (res.status === 503) {
        setDescribeOff(true);
        return;
      }
      if (!res.ok) {
        setProblem("The model didn't answer. Try again.");
        return;
      }
      const data = (await res.json()) as { params: ShelfParams };
      setParams(clampParams(data.params));
    } catch {
      setProblem("The model didn't answer. Try again.");
    } finally {
      setAsking(false);
    }
  }

  function download(kind: "stl" | "dxf") {
    const bytes = kind === "stl" ? toStl(boxes) : toDxf(boxes);
    const blob =
      typeof bytes === "string"
        ? new Blob([bytes], { type: "text/plain" })
        : new Blob([bytes as BlobPart], { type: "model/stl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(app.name)}-shelf.${kind}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {KEYS.map((key) => {
          const lim = PARAM_LIMITS[key];
          const id = `make-${block.id}-${key}`;
          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={id}>{lim.label}</Label>
                <span className="text-sm">{fmtValue(key, params[key])}</span>
              </div>
              <input
                id={id}
                type="range"
                className="plain-in w-full"
                min={lim.min}
                max={lim.max}
                step={1}
                value={params[key]}
                onChange={(e) => set(key, Number(e.target.value))}
                aria-valuetext={fmtValue(key, params[key])}
              />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ShelfSvg
          label="Front"
          boxes={boxes}
          viewW={params.width}
          viewH={params.height}
          project={(b) => ({
            x: b.x,
            y: params.height - (b.z + b.h),
            w: b.w,
            h: b.h,
          })}
        />
        <ShelfSvg
          label="Side"
          boxes={boxes}
          viewW={params.depth}
          viewH={params.height}
          project={(b) => ({
            x: b.y,
            y: params.height - (b.z + b.h),
            w: b.d,
            h: b.h,
          })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label>Cut list</Label>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 pr-2 font-normal">Part</th>
              <th className="py-1 pr-2 font-normal">Length</th>
              <th className="py-1 pr-2 font-normal">Width</th>
              <th className="py-1 pr-2 font-normal">Thick.</th>
              <th className="py-1 font-normal">Qty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.name}-${r.length}-${r.width}`}>
                <td className="py-1 pr-2">{r.name}</td>
                <td className="py-1 pr-2">{r.length}</td>
                <td className="py-1 pr-2">{r.width}</td>
                <td className="py-1 pr-2">{r.thickness}</td>
                <td className="py-1">{r.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => download("stl")}
          className={btn.quiet}
        >
          Download STL
        </button>
        <button
          type="button"
          onClick={() => download("dxf")}
          className={btn.quiet}
        >
          Download DXF
        </button>
      </div>
      <p className="text-sm text-muted">
        Send the STL to a 3D printer or the DXF to a CNC or panel-cutting shop.
        The DXF quotes instantly at SendCutSend (US).
      </p>

      {!describeOff && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`make-${block.id}-describe`}>Describe it</Label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void describe();
            }}
            className="flex gap-2"
          >
            <input
              id={`make-${block.id}-describe`}
              type="text"
              value={sentence}
              disabled={asking}
              onChange={(e) => setSentence(e.target.value)}
              placeholder="A shelf for 40 cookbooks, under a 1.2 m window"
              className={`${inputCls} min-w-0 flex-1`}
            />
            <button
              type="submit"
              disabled={asking || sentence.trim().length < 5}
              className={btn.primary}
            >
              {asking ? "Thinking…" : "Fill in"}
            </button>
          </form>
          <DataNotice />
        </div>
      )}
      {problem !== "" && <Status tone="bad">{problem}</Status>}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { saveBlockLines } from "@/app/apps/[id]/actions";
import { btn, Label, Status } from "@/components/ui";
import { formatMoney, quote } from "@/lib/price";
import type { BlockProps } from "../runtime/registry";

function ratesFrom(block: { lines: { rate: number }[] }): Record<number, number> {
  return Object.fromEntries(block.lines.map((l, i) => [i, l.rate]));
}

export default function Price({ block, spec, records, ctx }: BlockProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<number, number>>(() =>
    block.type === "price" ? ratesFrom(block) : {},
  );
  const [lastLabel, setLastLabel] = useState("");
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (block.type === "price") setRates(ratesFrom(block));
  }, [block]);

  useEffect(() => {
    if (block.type !== "price") return;
    const base = ratesFrom(block);
    const dirty = Object.entries(rates).some(([i, r]) => r !== base[Number(i)]);
    if (!dirty) return;
    const t = setTimeout(() => void persist(), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates, block]);

  if (block.type !== "price") return null;

  const sorted = [...records].sort(
    (a, b) =>
      +new Date(b.created_at ?? "") - +new Date(a.created_at ?? ""),
  );
  const collection = spec.collections.find((c) => c.id === block.collection);
  const nameField = collection?.fields.find((f) => f.type === "text");
  const nameOf = (row: (typeof records)[number]): string => {
    const data = (row.data ?? {}) as Record<string, unknown>;
    const v = nameField ? data[nameField.id] : undefined;
    return typeof v === "string" && v !== "" ? v : "Untitled";
  };
  const selectedId = sorted.some((r) => r.id === selected)
    ? (selected as string)
    : (sorted[0]?.id ?? null);
  const row = sorted.find((r) => r.id === selectedId) ?? null;
  const lines = block.lines.map((l, i) => ({
    ...l,
    rate: rates[i] ?? l.rate,
  }));
  const result = row ? quote(row, lines) : { items: [], total: 0 };
  const lineRows = row
    ? lines.map((line) => {
        const one = quote(row, [line]);
        return {
          line,
          qty: one.items[0]?.qty ?? 0,
          amount: one.items[0]?.amount ?? 0,
        };
      })
    : [];

  async function persist() {
    if (block.type !== "price") return;
    setNotice("");
    setProblem("");
    const next = block.lines.map((l, i) => ({ ...l, rate: rates[i] ?? l.rate }));
    try {
      const saved = await saveBlockLines(
        ctx.appId,
        ctx.version,
        block.id,
        next,
        `Changed the ${lastLabel} rate`,
      );
      if (!saved.ok) {
        setProblem(saved.error);
      } else if (saved.conflict) {
        setNotice("Your app changed elsewhere; rates reloaded.");
        ctx.refresh();
      } else {
        ctx.refresh();
      }
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Couldn't save the rate.");
    }
  }

  async function copyQuote() {
    if (block.type !== "price" || !row) return;
    const text = [
      nameOf(row),
      ...result.items.map(
        (i) =>
          `${i.label} x${i.qty} @ ${formatMoney(Math.round(i.rate * 100), block.currency)}/${i.unit}: ${formatMoney(i.amount, block.currency)}`,
      ),
      `Total: ${formatMoney(result.total, block.currency)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
      setProblem("Copy didn't work.");
    }
  }

  if (sorted.length === 0) return <p className="text-muted">Nothing here yet.</p>;

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex w-full flex-col gap-1.5">
        <Label htmlFor={`${block.id}-record`}>Record</Label>
        <select
          id={`${block.id}-record`}
          value={selectedId ?? ""}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-[12px] border-[1.5px] border-line bg-card px-4 py-2.5 text-ink"
        >
          {sorted.map((r) => (
            <option key={r.id} value={r.id}>
              {nameOf(r)}
            </option>
          ))}
        </select>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted text-left">
            <th scope="col" className="py-1 pr-2 font-semibold">Item</th>
            <th scope="col" className="py-1 pr-2 font-semibold">Qty</th>
            <th scope="col" className="py-1 pr-2 font-semibold">Rate</th>
            <th scope="col" className="py-1 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineRows.map(({ line, qty, amount }, i) => (
            <tr key={`${line.field}-${i}`} className="border-t border-line">
              <td className="py-1.5 pr-2">{line.label}</td>
              <td className="py-1.5 pr-2">{qty}</td>
              <td className="py-1.5 pr-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  aria-label={`${line.label} rate`}
                  value={rates[i] ?? line.rate}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setRates((r) => ({
                      ...r,
                      [i]: Number.isNaN(v) ? 0 : Math.max(0, v),
                    }));
                    setLastLabel(line.label);
                    setNotice("");
                    setCopied(false);
                  }}
                  className="w-20 rounded-[8px] border-[1.5px] border-line bg-card px-2 py-1 text-ink"
                />
              </td>
              <td className="py-1.5 text-right">
                {formatMoney(amount, block.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-display self-end text-2xl">
        Total: {formatMoney(result.total, block.currency)}
      </p>
      <button type="button" onClick={() => void copyQuote()} className={btn.quiet}>
        Copy quote
      </button>
      {notice !== "" && <Status tone="muted">{notice}</Status>}
      {problem !== "" && <Status tone="bad">{problem}</Status>}
      {copied && <Status tone="ok">Copied.</Status>}
    </div>
  );
}

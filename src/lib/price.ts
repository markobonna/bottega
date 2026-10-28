import type { Block } from "./spec/schema";

type PriceLine = Extract<Block, { type: "price" }>["lines"][number];

export interface QuoteItem {
  label: string;
  qty: number;
  rate: number;
  unit: string;
  amount: number;
}

export function quote(
  record: { data: unknown },
  lines: PriceLine[],
): { items: QuoteItem[]; total: number } {
  const data = (record.data ?? {}) as Record<string, unknown>;
  const items: QuoteItem[] = [];
  for (const line of lines) {
    const qty = Number(data[line.field]) || 0;
    if (qty === 0) continue;
    items.push({
      label: line.label,
      qty,
      rate: line.rate,
      unit: line.unit,
      amount: Math.round(line.rate * 100) * qty,
    });
  }
  return { items, total: items.reduce((sum, item) => sum + item.amount, 0) };
}

export function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  }
}

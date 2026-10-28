import type { Collection } from "./spec/schema";

// Value cleaning for record writes. Pure (no server-only import) so tests
// can import it; records.ts re-exports it for server code.

export type CheckResult = {
  ok: boolean;
  data: Record<string, string | number | boolean>;
  issues: string[];
};

/** Drop unknown keys, coerce by field type. */
export function checkValues(
  collection: Collection,
  data: Record<string, unknown>,
): CheckResult {
  const fields = new Map(collection.fields.map((f) => [f.id, f]));
  const cleaned: Record<string, string | number | boolean> = {};
  const issues: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    const field = fields.get(key);
    if (!field) continue;
    if (value === null || value === undefined) continue;
    switch (field.type) {
      case "text": {
        if (typeof value === "string") cleaned[key] = value;
        else if (typeof value === "number" || typeof value === "boolean") {
          cleaned[key] = String(value);
        } else {
          issues.push(`${key}: expected text`);
        }
        break;
      }
      case "number": {
        if (typeof value === "number") {
          if (Number.isFinite(value)) cleaned[key] = value;
          else issues.push(`${key}: expected a finite number`);
        } else if (typeof value === "string") {
          const n = Number(value.trim());
          if (value.trim() !== "" && Number.isFinite(n)) cleaned[key] = n;
          else issues.push(`${key}: expected a number`);
        } else {
          issues.push(`${key}: expected a number`);
        }
        break;
      }
      case "date": {
        if (value instanceof Date) {
          if (Number.isNaN(value.getTime())) issues.push(`${key}: bad date`);
          else cleaned[key] = value.toISOString().slice(0, 10);
        } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
          const d = new Date(`${value}T00:00:00Z`);
          if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value) {
            cleaned[key] = value;
          } else issues.push(`${key}: bad date '${value}'`);
        } else {
          issues.push(`${key}: date must be YYYY-MM-DD`);
        }
        break;
      }
      case "choice": {
        if (typeof value === "string" && field.options?.includes(value)) {
          cleaned[key] = value;
        } else {
          issues.push(
            `${key}: must be one of: ${(field.options ?? []).join(", ")}`,
          );
        }
        break;
      }
      case "bool": {
        if (typeof value === "boolean") cleaned[key] = value;
        else if (value === "true" || value === 1) cleaned[key] = true;
        else if (value === "false" || value === 0) cleaned[key] = false;
        else issues.push(`${key}: expected true or false`);
        break;
      }
      case "photo": {
        if (typeof value === "string" && looksLikeMediaPath(value)) {
          cleaned[key] = value;
        } else {
          issues.push(`${key}: photo path must look like <uid>/<appId>/<file>`);
        }
        break;
      }
    }
  }
  return { ok: issues.length === 0, data: cleaned, issues };
}

// Structural only (uid/appId binding needs auth context, so it can't live in
// this pure function); storage RLS enforces the real per-user boundary.
function looksLikeMediaPath(path: string): boolean {
  if (path.startsWith("/") || path.includes("\\")) return false;
  const parts = path.split("/");
  return (
    parts.length >= 3 &&
    parts.every((p) => p !== "" && p !== "." && p !== "..")
  );
}

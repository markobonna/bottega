import { describe, expect, it } from "vitest";
import maria from "./spec/fixtures/maria.json";
import { parseSpec, type AppSpec } from "./spec/schema";
import {
  buildCodegenPrompt,
  validateCodegenFiles,
} from "./codegen";

const spec = (parseSpec(maria) as { ok: true; spec: AppSpec }).spec;

const good = [
  { path: "index.html", content: "<!DOCTYPE html><html></html>" },
  { path: "styles.css", content: "body {}" },
  { path: "app.js", content: "console.log(1)" },
  { path: "README.txt", content: "how to open" },
];

describe("buildCodegenPrompt", () => {
  it("carries screens, blocks and fields into the prompt", () => {
    const { user } = buildCodegenPrompt(spec, "mobile");
    expect(user).toContain("Orders");
    expect(user).toContain("Take an order");
    expect(user).toContain("Customer [customer] (text)");
    expect(user).toContain("Quantity [quantity] (number)");
  });
  it("asks for a mobile layout on mobile, wide layout on desktop", () => {
    expect(buildCodegenPrompt(spec, "mobile").user).toContain("390px");
    expect(buildCodegenPrompt(spec, "mobile").user).toContain("bottom tab bar");
    expect(buildCodegenPrompt(spec, "desktop").user).toContain("1100px");
    expect(buildCodegenPrompt(spec, "desktop").user).toContain("top nav");
  });
  it("constrains output to dependency-free static files", () => {
    const { system } = buildCodegenPrompt(spec, "mobile");
    expect(system).toContain("localStorage");
    expect(system).toContain("No external anything");
  });
  it("never mentions backends, keys or urls", () => {
    const { system, user } = buildCodegenPrompt(spec, "desktop");
    for (const text of [system, user]) {
      expect(text.toLowerCase()).not.toContain("supabase");
      expect(text).not.toContain("NEXT_PUBLIC");
      expect(text).not.toContain("http");
    }
  });
});

describe("validateCodegenFiles", () => {
  it("accepts the exact four files", () => {
    const r = validateCodegenFiles(good);
    expect(r.ok).toBe(true);
  });
  it("rejects a missing file by name", () => {
    const r = validateCodegenFiles(good.slice(0, 3));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.join(" ")).toContain("README.txt");
  });
  it("accepts a partial set when only those paths are expected", () => {
    const design = good.slice(0, 2);
    expect(validateCodegenFiles(design, ["index.html", "styles.css"]).ok).toBe(
      true,
    );
    const r = validateCodegenFiles(design.slice(0, 1), [
      "index.html",
      "styles.css",
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.join(" ")).toContain("styles.css");
  });
  it("rejects unexpected paths, traversal and duplicates", () => {
    const extra = [...good, { path: "evil.sh", content: "x" }];
    expect(validateCodegenFiles(extra).ok).toBe(false);
    const trav = good.map((f) =>
      f.path === "app.js" ? { ...f, path: "../app.js" } : f,
    );
    const r = validateCodegenFiles(trav);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.join(" ")).toContain("bad path");
    expect(validateCodegenFiles([...good, good[0]]).ok).toBe(false);
  });
  it("rejects empty files and oversize totals", () => {
    const empty = good.map((f) =>
      f.path === "app.js" ? { ...f, content: "  " } : f,
    );
    expect(validateCodegenFiles(empty).ok).toBe(false);
    const big = good.map((f) => ({ ...f, content: "x".repeat(60000) }));
    const r = validateCodegenFiles(big);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.join(" ")).toContain("too large");
  });
});

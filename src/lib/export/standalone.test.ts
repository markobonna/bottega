import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildStandaloneHtml,
  embedJson,
  escHtml,
  seedRecords,
  standaloneCss,
} from "./standalone";
import coleSpec from "../spec/fixtures/cole.json";
import type { AppSpec } from "../spec/schema";

const spec = coleSpec as unknown as AppSpec;
const hostile = '</script><script>alert("x")</script>';

describe("embedJson", () => {
  it("round-trips exactly and can never close its script tag", () => {
    const value = { a: hostile, n: 3, z: null };
    expect(JSON.parse(embedJson(value))).toEqual(value);
    expect(embedJson(value)).not.toContain("</script");
    expect(embedJson(value)).not.toContain("<script");
  });
});

describe("escHtml", () => {
  it("escapes markup chars", () => {
    expect(escHtml('<b>"&\'</b>')).toBe(
      "&lt;b&gt;&quot;&amp;&#39;&lt;/b&gt;",
    );
  });
});

describe("seedRecords", () => {
  it("strips photo fields, keeps everything else", () => {
    const seed = seedRecords(spec, {
      pieces: [
        {
          id: "r1",
          data: { name: "Chair", before: "uid/app/x.jpg", scratches: 2 },
        } as never,
      ],
    });
    expect(seed.pieces[0].data).toEqual({
      name: "Chair",
      before: "",
      scratches: 2,
    });
  });
});

describe("buildStandaloneHtml", () => {
  const bootSrc = readFileSync(
    new URL("./standalone-boot.js", import.meta.url),
    "utf8",
  );
  const evilSpec = {
    ...spec,
    name: hostile,
    tagline: hostile,
    look: { ...spec.look, icon: hostile },
  };
  const html = buildStandaloneHtml({
    appId: 'a"b',
    appName: hostile,
    version: 7,
    spec: evilSpec,
    seed: { pieces: [{ id: "r1", data: { name: hostile } }] },
    bootSrc,
  });

  it("inlines the real renderer, which contains no script-closer", () => {
    expect(bootSrc).toContain("BottegaStandalone");
    expect(bootSrc).not.toContain("</script");
    expect(html).toContain("BottegaStandalone");
  });
  it("is a complete document with the app shell", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain('<main id="sa-root"></main>');
    expect(html).toContain("spec v7");
    expect(html).toContain(standaloneCss().split("\n")[0]);
  });
  it("escapes the app name everywhere it shows", () => {
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<title>" + hostile);
    // Only the three legitimate closers: spec, seed, boot.
    expect(html.split("</script>").length - 1).toBe(3);
  });
  it("embeds spec and seed as parseable JSON", () => {
    const grab = (id: string) => {
      const m = html.match(
        new RegExp(
          `<script type="application/json" id="${id}">([\\s\\S]*?)</script>`,
        ),
      );
      expect(m).not.toBe(null);
      return JSON.parse(m![1]);
    };
    expect(grab("sa-spec").name).toBe(hostile);
    expect(grab("sa-seed").pieces[0].data.name).toBe(hostile);
    expect(html).toContain('data-app="a&quot;b"');
  });
});

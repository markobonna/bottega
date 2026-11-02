import { describe, expect, it } from "vitest";

import {
  buildSoftwareDesignPrompt,
  buildSoftwarePrototypePrompt,
  buildSoftwareRevisePrompt,
  changedFilePaths,
  inlineFiles,
  mergeSoftwareFiles,
  parseSoftwareFilesState,
  SOFTWARE_DESIGN_SYSTEM,
  SOFTWARE_PROTOTYPE_SYSTEM,
  SOFTWARE_REVISE_SYSTEM,
} from "./software-build";

describe("software-build prompts", () => {
  it("design prompt carries the description verbatim and the form", () => {
    const { system, user } = buildSoftwareDesignPrompt(
      "upload my mp3 and distribute it",
      "desktop",
    );
    expect(system).toBe(SOFTWARE_DESIGN_SYSTEM);
    expect(user).toContain("upload my mp3 and distribute it");
    expect(user).toContain("desktop app");
    expect(buildSoftwareDesignPrompt("x", "mobile").user).toContain(
      "mobile app",
    );
  });

  it("design system asks for two static files, prototype for the wiring", () => {
    expect(SOFTWARE_DESIGN_SYSTEM).toContain("Exactly two files");
    expect(SOFTWARE_DESIGN_SYSTEM).toContain("index.html, styles.css");
    expect(SOFTWARE_PROTOTYPE_SYSTEM).toContain("app.js, README.txt");
    expect(SOFTWARE_PROTOTYPE_SYSTEM).toContain("wire THIS html");
  });

  it("prototype prompt carries the design it must wire", () => {
    const { system, user } = buildSoftwarePrototypePrompt("my app", "mobile", [
      { path: "index.html", content: '<button id="go">Go</button>' },
      { path: "styles.css", content: "button{color:red}" },
    ]);
    expect(system).toBe(SOFTWARE_PROTOTYPE_SYSTEM);
    expect(user).toContain("my app");
    expect(user).toContain("mobile app");
    expect(user).toContain("CURRENT DESIGN");
    expect(user).toContain("Go</button>");
    expect(user).toContain("button{color:red}");
  });

  it("revise prompt carries the request and current files", () => {
    const { system, user } = buildSoftwareRevisePrompt(
      [{ path: "index.html", content: "<h1>hi</h1>" }],
      "make it plum",
    );
    expect(system).toBe(SOFTWARE_REVISE_SYSTEM);
    expect(user).toContain("make it plum");
    expect(user).toContain("<h1>hi</h1>");
  });

  it("prototype system names the sandbox storage rule", () => {
    expect(SOFTWARE_PROTOTYPE_SYSTEM).toContain("try/catch");
    expect(SOFTWARE_PROTOTYPE_SYSTEM).toContain("in-memory fallback");
  });

  it("both build systems forbid faked integrations", () => {
    expect(SOFTWARE_PROTOTYPE_SYSTEM).toContain("Never fake an integration");
    expect(SOFTWARE_DESIGN_SYSTEM).toContain("Never structure a faked integration");
  });
});

describe("mergeSoftwareFiles", () => {
  it("adds new paths and lets incoming win on repeats", () => {
    expect(
      mergeSoftwareFiles(
        [
          { path: "index.html", content: "old html" },
          { path: "styles.css", content: "css" },
        ],
        [
          { path: "app.js", content: "js" },
          { path: "index.html", content: "new html" },
        ],
      ),
    ).toEqual([
      { path: "index.html", content: "new html" },
      { path: "styles.css", content: "css" },
      { path: "app.js", content: "js" },
    ]);
  });
});

describe("changedFilePaths", () => {
  it("names only files whose content differs", () => {
    expect(
      changedFilePaths(
        [
          { path: "index.html", content: "a" },
          { path: "app.js", content: "b" },
        ],
        [
          { path: "index.html", content: "a2" },
          { path: "app.js", content: "b" },
        ],
      ),
    ).toEqual(["index.html"]);
  });
});

describe("inlineFiles", () => {
  it("inlines the stylesheet and script, escaping nested closes", () => {
    const out = inlineFiles([
      {
        path: "index.html",
        content:
          '<html><head><link rel="stylesheet" href="styles.css"></head><body><script src="app.js"></script></body></html>',
      },
      { path: "styles.css", content: "body{color:red}" },
      { path: "app.js", content: 'document.write("</scr" + "ipt>")' },
      { path: "README.txt", content: "hi" },
    ]);
    expect(out).toContain("<style>\nbody{color:red}\n</style>");
    expect(out).toContain("document.write(");
    expect(out).not.toContain('src="app.js"');
    expect(out).not.toContain("styles.css");
  });

  it("injects the preview guard after <head>, else at the top", () => {
    const withHead = inlineFiles([
      { path: "index.html", content: "<html><head><title>t</title></head></html>" },
    ]);
    expect(withHead.indexOf('closest("a[href]")')).toBeGreaterThan(
      withHead.indexOf("<head>"),
    );
    const bare = inlineFiles([
      { path: "index.html", content: "<p>no head here</p>" },
    ]);
    expect(bare.startsWith("<script>document.addEventListener")).toBe(true);
    for (const out of [withHead, bare]) {
      expect(out).toContain("preventDefault");
    }
  });

  it("previews a design-only set: CSS inlined, script tag emptied", () => {
    const out = inlineFiles([
      {
        path: "index.html",
        content:
          '<html><head><link rel="stylesheet" href="styles.css"></head><body><script src="app.js"></script></body></html>',
      },
      { path: "styles.css", content: "body{color:red}" },
    ]);
    expect(out).toContain("<style>\nbody{color:red}\n</style>");
    expect(out).not.toContain('src="app.js"');
    expect(out).not.toContain("styles.css");
  });
});

describe("parseSoftwareFilesState", () => {
  it("round-trips a valid state and rejects garbage", () => {
    const state = {
      files: [{ path: "index.html", content: "x" }],
      formFactor: "mobile",
      via: "meta",
      updatedAt: "2026-11-02",
      history: [],
    };
    expect(parseSoftwareFilesState(state)).toEqual(state);
    expect(parseSoftwareFilesState(null)).toBeNull();
    expect(parseSoftwareFilesState({ files: [] })).toBeNull();
  });
});

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { json, jsonWithFallback, type MetaMessage } from "./meta";
import { needApp } from "./ownership";
import {
  EDITOR_SYSTEM,
  WireEditSchema,
  wireOpToOp,
  type WireEdit,
} from "./prompts";
import { applyOps, type Op } from "./spec/ops";
import { diffSpecs, type SpecDiff } from "./spec/diff";
import { reviseSoftwareFiles } from "./software-server";
import {
  changedFilePaths,
  parseSoftwareFilesState,
} from "./software-build";
import { parseSpec, type AppSpec } from "./spec/schema";
import type { Database } from "./supabase/types";

export class EditError extends Error {
  status: number;
  issues?: string[];
  constructor(status: number, message: string, issues?: string[]) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

export interface EditProposal {
  summary: string;
  ops: Op[];
  baseVersion: number;
  preview: SpecDiff;
  answeredBy?: string;
  files?: { path: string; content: string }[];
}

function attempt(
  spec: AppSpec,
  wire: WireEdit,
): { ok: true; spec: AppSpec; ops: Op[] } | { ok: false; issues: string[] } {
  try {
    const ops = wire.ops.map((w, i) => wireOpToOp(w, i));
    const applied = applyOps(spec, ops);
    if (!applied.ok) return applied;
    return { ok: true, spec: applied.spec, ops };
  } catch (e) {
    return { ok: false, issues: [e instanceof Error ? e.message : "bad op"] };
  }
}

// Shared by POST /api/edit and the talk bar's edit_app action.
export async function proposeEdit(
  supabase: SupabaseClient<Database>,
  appId: string,
  request: string,
): Promise<EditProposal> {
  try {
    await needApp(supabase, appId);
  } catch {
    throw new EditError(404, "No such project.");
  }
  const { data: app } = await supabase
    .from("apps")
    .select("spec, version, private, build_files")
    .eq("id", appId)
    .maybeSingle();
  if (!app) throw new EditError(404, "No such project.");
  const filesState = parseSoftwareFilesState(app.build_files);
  if (filesState) {
    // Spark-built software: revise the files directly, Replit-style.
    // Nothing is saved; accept() stores the returned files.
    const { files, via } = await reviseSoftwareFiles(
      filesState.files,
      request,
    );
    const changed = changedFilePaths(filesState.files, files);
    return {
      summary:
        changed.length > 0
          ? `Code updated (${changed.join(", ")})`
          : "No changes needed",
      ops: [],
      baseVersion: app.version,
      preview: {
        added: [],
        changed: changed.map((p) => `File: ${p} updated`),
        removed: [],
      },
      files,
      ...(via === "open" ? { answeredBy: "muse-spark-open" } : {}),
    };
  }
  const parsed = parseSpec(app.spec);
  if (!parsed.ok) throw new EditError(404, "Bad project spec.");
  const base = JSON.stringify(parsed.spec);
  // Private apps stay on local/open and never fall back (a local failure must
  // not leak the request to hosted open weights, nor open to itself).
  const priv = app.private ?? false;
  let viaOpen = false;
  async function ask(messages: MetaMessage[]): Promise<WireEdit> {
    if (priv) {
      return json(messages, WireEditSchema, {
        reasoning: "medium",
        maxTokens: 4000,
        private: true,
      });
    }
    const r = await jsonWithFallback(messages, WireEditSchema, {
      reasoning: "medium",
      maxTokens: 4000,
    });
    viaOpen = viaOpen || r.via === "open";
    return r.data;
  }
  let draft = await ask([
    { role: "system", content: EDITOR_SYSTEM },
    { role: "user", content: `Current spec:\n${base}\n\nRequest: ${request}` },
  ]);
  let tried = attempt(parsed.spec, draft);
  if (!tried.ok) {
    draft = await ask([
      { role: "system", content: EDITOR_SYSTEM },
      {
        role: "user",
        content: `Current spec:\n${base}\n\nRequest: ${request}\n\nPrevious reply:\n${JSON.stringify(draft)}\n\nIssues:\n${tried.issues.join("\n")}\n\nFix only these problems.`,
      },
    ]);
    tried = attempt(parsed.spec, draft);
  }
  if (!tried.ok) {
    throw new EditError(
      422,
      "Couldn't change the project from that. Try rewording the request.",
      tried.issues,
    );
  }
  return {
    summary: draft.summary,
    ops: tried.ops,
    baseVersion: app.version,
    preview: diffSpecs(parsed.spec, tried.spec),
    ...(viaOpen ? { answeredBy: "muse-spark-open" } : {}),
  };
}

import "server-only";

import { CodegenFilesSchema, validateCodegenFiles } from "./codegen";
import { jsonWithFallback, ModelError } from "./meta";
import {
  buildSoftwareDesignPrompt,
  buildSoftwarePrototypePrompt,
  buildSoftwareRevisePrompt,
  mergeSoftwareFiles,
  type SoftwareFiles,
} from "./software-build";
import type { FormFactor } from "./codegen";

/** Server-only model calls for Spark-built software. Two phases, two
 *  small replies instead of one giant one: the design (HTML + CSS, the
 *  Blueprint) first, then the prototype (JS + readme) wired to that
 *  exact HTML. Each reply stays small enough to finish in one go. */

const DESIGN_PATHS = ["index.html", "styles.css"] as const;
const PROTOTYPE_PATHS = ["app.js", "README.txt"] as const;

export async function generateSoftwareDesign(
  description: string,
  formFactor: FormFactor,
): Promise<{ files: SoftwareFiles; via: "meta" | "open" }> {
  const { system, user } = buildSoftwareDesignPrompt(description, formFactor);
  const { data, via } = await jsonWithFallback(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    CodegenFilesSchema,
    { reasoning: "medium", maxTokens: 8000, timeoutMs: 120000 },
  );
  const checked = validateCodegenFiles(data.files, DESIGN_PATHS);
  if (!checked.ok) {
    throw new ModelError(502, `bad files: ${checked.issues.join("; ")}`);
  }
  return { files: checked.files, via };
}

export async function generateSoftwarePrototype(
  description: string,
  formFactor: FormFactor,
  design: SoftwareFiles,
): Promise<{ files: SoftwareFiles; via: "meta" | "open" }> {
  const { system, user } = buildSoftwarePrototypePrompt(
    description,
    formFactor,
    design,
  );
  const { data, via } = await jsonWithFallback(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    CodegenFilesSchema,
    { reasoning: "medium", maxTokens: 8000, timeoutMs: 120000 },
  );
  const checked = validateCodegenFiles(data.files, PROTOTYPE_PATHS);
  if (!checked.ok) {
    throw new ModelError(502, `bad files: ${checked.issues.join("; ")}`);
  }
  return { files: mergeSoftwareFiles(design, checked.files), via };
}

export async function reviseSoftwareFiles(
  files: SoftwareFiles,
  request: string,
): Promise<{ files: SoftwareFiles; via: "meta" | "open" }> {
  const { system, user } = buildSoftwareRevisePrompt(files, request);
  const { data, via } = await jsonWithFallback(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    CodegenFilesSchema,
    { reasoning: "medium", maxTokens: 16000, timeoutMs: 120000 },
  );
  const checked = validateCodegenFiles(
    data.files,
    files.map((f) => f.path),
  );
  if (!checked.ok) {
    throw new ModelError(502, `bad files: ${checked.issues.join("; ")}`);
  }
  return { files: checked.files, via };
}

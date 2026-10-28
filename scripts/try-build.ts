import { json } from "../src/lib/meta";
import { BUILDER_SYSTEM, WireSpecSchema } from "../src/lib/prompts";
import { parseSpec } from "../src/lib/spec/schema";

// Live check for the build pipeline (same as POST /api/build, minus saving).
async function main() {
  const description = process.argv
    .slice(2)
    .filter((a) => a !== "--")
    .join(" ")
    .trim();
  if (!description) {
    console.error("usage: pnpm run try-build -- <description>");
    process.exit(1);
  }
  let draft = await json(
    [
      { role: "system", content: BUILDER_SYSTEM },
      { role: "user", content: description },
    ],
    WireSpecSchema,
    { reasoning: "medium", maxTokens: 4000 },
  );
  let parsed = parseSpec(draft);
  if (!parsed.ok) {
    console.error(`first draft failed (${parsed.issues.length} issues), repairing…`);
    draft = await json(
      [
        { role: "system", content: BUILDER_SYSTEM },
        {
          role: "user",
          content: `${description}\n\nPrevious spec:\n${JSON.stringify(draft)}\n\nIssues:\n${parsed.issues.join("\n")}\n\nFix only these problems.`,
        },
      ],
      WireSpecSchema,
      { reasoning: "medium", maxTokens: 4000 },
    );
    parsed = parseSpec(draft);
  }
  if (!parsed.ok) {
    console.error("still invalid:");
    for (const issue of parsed.issues) console.error(`- ${issue}`);
    process.exit(1);
  }
  for (const screen of parsed.spec.screens) {
    console.log(`${screen.title}: ${screen.blocks.map((b) => b.type).join(", ")}`);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

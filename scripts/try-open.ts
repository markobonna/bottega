import { z } from "zod";

import {
  json,
  ProviderUnavailableError,
  type Provider,
} from "../src/lib/meta";

// Live check for the open-weights providers: one small json() call each.
const ProbeSchema = z.object({ n: z.number() });

async function probe(provider: Provider): Promise<boolean> {
  const model =
    provider === "open"
      ? process.env.OPEN_MODEL || "(unset)"
      : process.env.LOCAL_MODEL || "(unset)";
  const started = Date.now();
  try {
    const data = await json(
      [{ role: "user", content: 'Reply with JSON only: {"n": 1}' }],
      ProbeSchema,
      { provider, reasoning: "minimal", maxTokens: 200 },
    );
    console.log(
      `${provider}: model=${model} latency=${Date.now() - started}ms zod=PASS data=${JSON.stringify(data)}`,
    );
    return true;
  } catch (e) {
    if (e instanceof ProviderUnavailableError) {
      console.log(`${provider}: not configured, skipped`);
      return provider !== "open";
    }
    console.log(
      `${provider}: model=${model} latency=${Date.now() - started}ms FAIL ${e instanceof Error ? e.message : e}`,
    );
    return false;
  }
}

async function main() {
  const openOk = await probe("open");
  const localOk =
    process.env.LOCAL_BASE_URL && process.env.LOCAL_MODEL
      ? await probe("local")
      : (console.log("local: not configured, skipped"), true);
  if (!openOk || !localOk) process.exit(1);
  console.log("TRY-OPEN PASS");
}

void main();

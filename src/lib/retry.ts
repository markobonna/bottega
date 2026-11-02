/** Retry a flaky async op (model calls, storage uploads) a few times
 *  with backoff. Pure control flow + a wait line on stdout; the seed
 *  and repaint scripts wrap every network hop in it so one transient
 *  504 or timeout can't kill a multi-minute run. */

export interface RetryOpts {
  label?: string;
  tries?: number;
  delaysMs?: number[];
  /** Return true for errors that must fail immediately (missing key). */
  fatal?: (e: unknown) => boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function retryAsync<T>(
  fn: () => Promise<T>,
  { label = "op", tries = 3, delaysMs = [2000, 8000], fatal }: RetryOpts = {},
): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (fatal?.(e) || attempt === tries) throw e;
      console.log(
        `[bottega] ${label} failed (attempt ${attempt}/${tries}), retrying…`,
      );
      await sleep(delaysMs[Math.min(attempt - 1, delaysMs.length - 1)]);
    }
  }
  throw last;
}

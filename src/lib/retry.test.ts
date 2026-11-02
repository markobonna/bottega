import { describe, expect, it, vi } from "vitest";

import { retryAsync } from "./retry";

describe("retryAsync", () => {
  it("returns the first success without retrying", async () => {
    const fn = vi.fn(async () => "ok");
    await expect(retryAsync(fn, { label: "t" })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries failures, then returns the recovery", async () => {
    const fn = vi
      .fn(async () => "ok")
      .mockRejectedValueOnce(new Error("504"))
      .mockRejectedValueOnce(new Error("timeout"));
    await expect(
      retryAsync(fn, { label: "t", delaysMs: [1, 1] }),
    ).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws the last error after the tries run out", async () => {
    const fn = vi.fn(async () => {
      throw new Error("down");
    });
    await expect(
      retryAsync(fn, { label: "t", tries: 2, delaysMs: [1] }),
    ).rejects.toThrow("down");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("fatal errors fail immediately with no retry", async () => {
    const fn = vi.fn(async () => {
      throw new Error("no key");
    });
    await expect(
      retryAsync(fn, {
        label: "t",
        fatal: (e) => e instanceof Error && e.message === "no key",
      }),
    ).rejects.toThrow("no key");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

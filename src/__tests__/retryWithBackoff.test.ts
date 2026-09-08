import { describe, expect, it, vi } from "vitest";
import { retryWithBackoff } from "../autofix/retryWithBackoff.js";

describe("retryWithBackoff", () => {
  it("succeeds immediately without sleeping", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const attempt = vi.fn().mockResolvedValue(undefined);

    const result = await retryWithBackoff(attempt, { maxAttempts: 3, baseDelayMs: 10, sleep });

    expect(result.succeeded).toBe(true);
    expect(result.attempts).toBe(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries with backoff and eventually succeeds", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    let calls = 0;
    const attempt = vi.fn().mockImplementation(async () => {
      calls += 1;
      if (calls < 3) throw new Error("not yet");
    });

    const result = await retryWithBackoff(attempt, { maxAttempts: 3, baseDelayMs: 10, sleep });

    expect(result.succeeded).toBe(true);
    expect(result.attempts).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 10);
    expect(sleep).toHaveBeenNthCalledWith(2, 20);
  });

  it("reports failure after exhausting attempts", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const attempt = vi.fn().mockRejectedValue(new Error("nope"));

    const result = await retryWithBackoff(attempt, { maxAttempts: 2, baseDelayMs: 5, sleep });

    expect(result.succeeded).toBe(false);
    expect(result.attempts).toBe(2);
    expect(result.lastError).toBeInstanceOf(Error);
  });
});

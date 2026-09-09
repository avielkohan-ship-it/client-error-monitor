import { describe, expect, it } from "vitest";
import { detectCallError } from "../detectors/callDetector.js";
import { CallEvent } from "../types.js";

const base: CallEvent = {
  type: "call",
  clientId: "example-clinic",
  callId: "call-1",
  durationSeconds: 90,
  endReason: "completed",
};

describe("detectCallError", () => {
  it("flags an abrupt hangup", () => {
    const result = detectCallError({ ...base, endReason: "hangup_abrupt" });
    expect(result.isError).toBe(true);
    expect(result.category).toBe("bad_call_ending");
  });

  it("flags a silence timeout", () => {
    const result = detectCallError({ ...base, endReason: "silence_timeout" });
    expect(result.isError).toBe(true);
  });

  it("flags a call nobody answered", () => {
    const result = detectCallError({ ...base, endReason: "no_answer", durationSeconds: 0 });
    expect(result.isError).toBe(true);
  });

  it("flags a suspiciously short completed call", () => {
    const result = detectCallError({ ...base, durationSeconds: 2 });
    expect(result.isError).toBe(true);
  });

  it("does not flag a normal completed call", () => {
    const result = detectCallError(base);
    expect(result.isError).toBe(false);
  });
});

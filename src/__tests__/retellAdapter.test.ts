import { describe, expect, it } from "vitest";
import { retellWebhookToCallEvent, verifyRetellSignature } from "../adapters/retell.js";
import { createHmac } from "node:crypto";

describe("retellWebhookToCallEvent", () => {
  it("maps a no-answer disconnection to no_answer", () => {
    const event = retellWebhookToCallEvent("example-clinic", {
      event: "call_ended",
      call: { call_id: "call_1", disconnection_reason: "dial_no_answer", duration_ms: 4000 },
    });
    expect(event?.endReason).toBe("no_answer");
    expect(event?.durationSeconds).toBe(4);
  });

  it("maps an unrecognized/no disconnection reason to completed", () => {
    const event = retellWebhookToCallEvent("example-clinic", {
      event: "call_ended",
      call: { call_id: "call_2", duration_ms: 60000 },
    });
    expect(event?.endReason).toBe("completed");
  });

  it("ignores non call-ended events", () => {
    const event = retellWebhookToCallEvent("example-clinic", {
      event: "call_started",
      call: { call_id: "call_3" },
    });
    expect(event).toBeNull();
  });
});

describe("verifyRetellSignature", () => {
  it("accepts a correctly signed body", () => {
    const secret = "shh";
    const body = '{"event":"call_ended"}';
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyRetellSignature(body, signature, secret)).toBe(true);
  });

  it("rejects an incorrect signature", () => {
    expect(verifyRetellSignature("body", "deadbeef", "shh")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { calcomWebhookToBookingEvent, verifyCalcomSignature } from "../adapters/calcom.js";
import { createHmac } from "node:crypto";

describe("calcomWebhookToBookingEvent", () => {
  it("maps a BOOKING_CANCELLED event to a failed booking", () => {
    const event = calcomWebhookToBookingEvent("example-clinic", {
      triggerEvent: "BOOKING_CANCELLED",
      payload: {
        uid: "abc123",
        startTime: "2026-09-10T15:00:00Z",
        cancellationReason: "double booked",
        attendees: [{ name: "Jane Doe" }],
      },
    });

    expect(event).not.toBeNull();
    expect(event?.status).toBe("failed");
    expect(event?.errorMessage).toBe("double booked");
    expect(event?.patientOrCustomerName).toBe("Jane Doe");
  });

  it("ignores events that aren't failures", () => {
    const event = calcomWebhookToBookingEvent("example-clinic", {
      triggerEvent: "BOOKING_CREATED",
      payload: {},
    });
    expect(event).toBeNull();
  });
});

describe("verifyCalcomSignature", () => {
  it("accepts a correctly signed body", () => {
    const secret = "shh";
    const body = '{"triggerEvent":"BOOKING_CANCELLED"}';
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyCalcomSignature(body, signature, secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const secret = "shh";
    const signature = createHmac("sha256", secret).update("original").digest("hex");
    expect(verifyCalcomSignature("tampered", signature, secret)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(verifyCalcomSignature("body", undefined, "shh")).toBe(false);
  });
});

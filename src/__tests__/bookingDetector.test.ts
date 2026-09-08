import { describe, expect, it } from "vitest";
import { detectBookingError } from "../detectors/bookingDetector.js";
import { BookingEvent } from "../types.js";

const base: BookingEvent = {
  type: "booking",
  clientId: "example-clinic",
  source: "opendental",
  status: "success",
  requestedTime: "2026-09-10T15:00:00Z",
};

describe("detectBookingError", () => {
  it("flags an explicit failure", () => {
    const result = detectBookingError({ ...base, status: "failed", errorMessage: "slot taken" });
    expect(result.isError).toBe(true);
    expect(result.category).toBe("failed_booking");
    expect(result.reason).toContain("slot taken");
  });

  it("flags success with no confirmed time as an error", () => {
    const result = detectBookingError({ ...base, requestedTime: undefined });
    expect(result.isError).toBe(true);
    expect(result.category).toBe("failed_booking");
  });

  it("does not flag a normal successful booking", () => {
    const result = detectBookingError(base);
    expect(result.isError).toBe(false);
  });
});

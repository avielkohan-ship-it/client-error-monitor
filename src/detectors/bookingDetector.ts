import { BookingEvent, DetectionResult } from "../types.js";

export function detectBookingError(event: BookingEvent): DetectionResult {
  if (event.status === "failed") {
    return {
      isError: true,
      category: "failed_booking",
      reason: event.errorMessage
        ? `Booking failed: ${event.errorMessage}`
        : "Booking failed with no error message from the source system.",
    };
  }

  if (!event.requestedTime) {
    return {
      isError: true,
      category: "failed_booking",
      reason: "Booking reported success but is missing a confirmed time.",
    };
  }

  return { isError: false, reason: "Booking completed normally." };
}

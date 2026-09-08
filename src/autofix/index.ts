import { ClientEvent, ErrorCategory, FixResult } from "../types.js";
import { autoFixBooking } from "./bookingRetry.js";
import { autoFixCall } from "./callRetry.js";

export async function runAutoFix(category: ErrorCategory, event: ClientEvent): Promise<FixResult> {
  if (category === "failed_booking" && event.type === "booking") {
    return autoFixBooking(event);
  }
  if (category === "bad_call_ending" && event.type === "call") {
    return autoFixCall(event);
  }
  return {
    attempted: false,
    succeeded: false,
    attempts: 0,
    detail: "No auto-fix strategy for this error category.",
  };
}

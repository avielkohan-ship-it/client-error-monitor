import { CallEvent, DetectionResult } from "../types.js";

const BAD_END_REASONS = new Set([
  "hangup_abrupt",
  "silence_timeout",
  "error",
]);

const MIN_HEALTHY_CALL_SECONDS = 5;

export function detectCallError(event: CallEvent): DetectionResult {
  if (BAD_END_REASONS.has(event.endReason)) {
    return {
      isError: true,
      category: "bad_call_ending",
      reason: `Call ended badly (${event.endReason}) after ${event.durationSeconds}s.`,
    };
  }

  if (event.endReason === "completed" && event.durationSeconds < MIN_HEALTHY_CALL_SECONDS) {
    return {
      isError: true,
      category: "bad_call_ending",
      reason: `Call marked completed but only lasted ${event.durationSeconds}s, which is suspiciously short.`,
    };
  }

  return { isError: false, reason: "Call ended normally." };
}

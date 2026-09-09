import { createHmac, timingSafeEqual } from "node:crypto";
import { CallEndReason, CallEvent } from "../types.js";

/**
 * Retell AI sends webhooks shaped like:
 *   { "event": "call_ended", "call": { "call_id": "...", "agent_id": "...",
 *     "call_status": "ended", "disconnection_reason": "agent_hangup" | "user_hangup" |
 *     "dial_no_answer" | "dial_busy" | "dial_failed" | "voicemail_reached" |
 *     "error_llm_websocket_open" | "error_no_audio_received" | ..., "duration_ms": 12345,
 *     "transcript": "..." } }
 * signed with header `X-Retell-Signature`, HMAC-SHA256 of the raw body using
 * your Retell API key. Retell's exact field/event names can change between
 * API versions — if a real payload doesn't match, check Retell's dashboard
 * webhook logs for a sample and adjust the mapping below.
 */
const BAD_DISCONNECTION_REASONS: Record<string, CallEndReason> = {
  dial_no_answer: "no_answer",
  dial_busy: "hangup_abrupt",
  dial_failed: "error",
  voicemail_reached: "voicemail",
  error_llm_websocket_open: "error",
  error_no_audio_received: "silence_timeout",
  error_unknown: "error",
};

export function verifyRetellSignature(rawBody: string, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf-8");
  const b = Buffer.from(signatureHeader, "utf-8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface RetellWebhookBody {
  event: string;
  call: {
    call_id: string;
    disconnection_reason?: string;
    duration_ms?: number;
    transcript?: string;
  };
}

/** Returns null if this event isn't a call-ended event. */
export function retellWebhookToCallEvent(clientId: string, body: RetellWebhookBody): CallEvent | null {
  if (body.event !== "call_ended" && body.event !== "call_analyzed") return null;

  const reason = body.call.disconnection_reason ?? "";
  const endReason: CallEndReason = BAD_DISCONNECTION_REASONS[reason] ?? "completed";

  return {
    type: "call",
    clientId,
    callId: body.call.call_id,
    durationSeconds: Math.round((body.call.duration_ms ?? 0) / 1000),
    endReason,
    transcriptSnippet: body.call.transcript?.slice(0, 500),
    raw: body,
  };
}

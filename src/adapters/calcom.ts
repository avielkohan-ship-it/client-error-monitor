import { createHmac, timingSafeEqual } from "node:crypto";
import { BookingEvent } from "../types.js";

/**
 * Cal.com sends webhooks shaped like:
 *   { "triggerEvent": "BOOKING_CANCELLED", "payload": { "uid": "...", "title": "...",
 *     "startTime": "...", "attendees": [{ "name": "...", "email": "..." }],
 *     "status": "CANCELLED", "cancellationReason": "...", ... } }
 * signed with header `X-Cal-Signature-256` = hex HMAC-SHA256 of the raw body,
 * using the secret set on the webhook in the Cal.com dashboard.
 *
 * Treat these trigger events as booking failures worth acting on. Cal.com's
 * exact event list can change — if a real payload doesn't match, check the
 * "Webhooks" tab in Cal.com settings for a sample and adjust FAILURE_EVENTS.
 */
const FAILURE_EVENTS = new Set([
  "BOOKING_CANCELLED",
  "BOOKING_REJECTED",
  "BOOKING_PAYMENT_INITIATED",
  "BOOKING_NO_SHOW_UPDATED",
]);

export function verifyCalcomSignature(rawBody: string, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf-8");
  const b = Buffer.from(signatureHeader, "utf-8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface CalcomWebhookBody {
  triggerEvent: string;
  payload: {
    uid?: string;
    title?: string;
    startTime?: string;
    status?: string;
    cancellationReason?: string;
    attendees?: { name?: string; email?: string }[];
  };
}

/** Returns null if this event isn't one we treat as a booking failure. */
export function calcomWebhookToBookingEvent(clientId: string, body: CalcomWebhookBody): BookingEvent | null {
  if (!FAILURE_EVENTS.has(body.triggerEvent)) return null;

  const attendeeName = body.payload.attendees?.[0]?.name;

  return {
    type: "booking",
    clientId,
    source: "calcom",
    status: "failed",
    patientOrCustomerName: attendeeName,
    requestedTime: body.payload.startTime,
    errorMessage: body.payload.cancellationReason ?? `Cal.com event: ${body.triggerEvent}`,
    raw: body,
  };
}

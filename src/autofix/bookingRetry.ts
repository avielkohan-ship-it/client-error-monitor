import { getClient } from "../clients.js";
import { logger } from "../logger.js";
import { BookingEvent, FixResult } from "../types.js";
import { retryWithBackoff } from "./retryWithBackoff.js";

/**
 * Auto-fix for a failed booking: re-submit the booking to the client's
 * booking system a few times with backoff. Requires the client to have a
 * `bookingRetryUrl` configured in config/clients.json; otherwise this is a
 * no-op and the error is just surfaced via notification.
 */
export async function autoFixBooking(event: BookingEvent): Promise<FixResult> {
  const client = getClient(event.clientId);

  if (!client?.bookingRetryUrl) {
    return {
      attempted: false,
      succeeded: false,
      attempts: 0,
      detail: `No bookingRetryUrl configured for client "${event.clientId}"; skipping auto-fix.`,
    };
  }

  const result = await retryWithBackoff(
    async () => {
      const response = await fetch(client.bookingRetryUrl!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...client.bookingRetryHeaders,
        },
        body: JSON.stringify({
          patientOrCustomerName: event.patientOrCustomerName,
          requestedTime: event.requestedTime,
          source: event.source,
          retriedBy: "client-error-monitor",
        }),
      });
      if (!response.ok) {
        throw new Error(`Retry endpoint responded with ${response.status}`);
      }
    },
    { maxAttempts: 3, baseDelayMs: 1000 },
  );

  if (result.succeeded) {
    logger.info(`Auto-fix succeeded for booking (client=${event.clientId}) after ${result.attempts} attempt(s).`);
  } else {
    logger.error(
      `Auto-fix failed for booking (client=${event.clientId}) after ${result.attempts} attempt(s).`,
      result.lastError,
    );
  }

  return {
    attempted: true,
    succeeded: result.succeeded,
    attempts: result.attempts,
    detail: result.succeeded
      ? `Booking re-submitted successfully on attempt ${result.attempts}.`
      : `Booking retry failed after ${result.attempts} attempt(s): ${String(result.lastError)}`,
  };
}

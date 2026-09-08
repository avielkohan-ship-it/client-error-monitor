import { getClient } from "../clients.js";
import { logger } from "../logger.js";
import { CallEvent, FixResult } from "../types.js";
import { retryWithBackoff } from "./retryWithBackoff.js";

/**
 * Auto-fix for a bad call ending: ask the client's voice platform to place a
 * callback to the same customer. Requires `callCallbackUrl` in
 * config/clients.json; otherwise this is a no-op and the error is just
 * surfaced via notification.
 */
export async function autoFixCall(event: CallEvent): Promise<FixResult> {
  const client = getClient(event.clientId);

  if (!client?.callCallbackUrl) {
    return {
      attempted: false,
      succeeded: false,
      attempts: 0,
      detail: `No callCallbackUrl configured for client "${event.clientId}"; skipping auto-fix.`,
    };
  }

  const result = await retryWithBackoff(
    async () => {
      const response = await fetch(client.callCallbackUrl!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...client.callCallbackHeaders,
        },
        body: JSON.stringify({
          originalCallId: event.callId,
          reason: event.endReason,
          triggeredBy: "client-error-monitor",
        }),
      });
      if (!response.ok) {
        throw new Error(`Callback endpoint responded with ${response.status}`);
      }
    },
    { maxAttempts: 2, baseDelayMs: 2000 },
  );

  if (result.succeeded) {
    logger.info(`Auto-fix succeeded for call (client=${event.clientId}, call=${event.callId}).`);
  } else {
    logger.error(
      `Auto-fix failed for call (client=${event.clientId}, call=${event.callId}).`,
      result.lastError,
    );
  }

  return {
    attempted: true,
    succeeded: result.succeeded,
    attempts: result.attempts,
    detail: result.succeeded
      ? `Callback requested successfully on attempt ${result.attempts}.`
      : `Callback request failed after ${result.attempts} attempt(s): ${String(result.lastError)}`,
  };
}

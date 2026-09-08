import { runAutoFix } from "./autofix/index.js";
import { detectBookingError } from "./detectors/bookingDetector.js";
import { detectCallError } from "./detectors/callDetector.js";
import { logger } from "./logger.js";
import { notify } from "./notify/index.js";
import { saveErrorRecord, updateErrorRecord } from "./store.js";
import { ClientEvent, ErrorRecord } from "./types.js";

/**
 * Runs an incoming client event through detection, then (if it's an error)
 * auto-fix and notification, then persists the result. Returns null when no
 * error was detected.
 */
export async function processEvent(event: ClientEvent): Promise<ErrorRecord | null> {
  const detection =
    event.type === "booking" ? detectBookingError(event) : detectCallError(event);

  if (!detection.isError || !detection.category) {
    logger.info(`No error detected for ${event.type} event (client=${event.clientId}).`);
    return null;
  }

  logger.warn(`Error detected: ${detection.reason}`, { clientId: event.clientId });

  const fix = await runAutoFix(detection.category, event);

  const record = saveErrorRecord({
    clientId: event.clientId,
    category: detection.category,
    reason: detection.reason,
    event,
    fix,
    notified: false,
    resolved: fix.succeeded,
  });

  const notified = await notify(record);
  record.notified = notified;
  updateErrorRecord(record.id, { notified });

  return record;
}

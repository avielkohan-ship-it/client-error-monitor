import { ErrorRecord } from "../types.js";
import { sendPush } from "./push.js";
import { sendSms } from "./sms.js";

function formatMessage(record: ErrorRecord): string {
  const fixStatus = !record.fix.attempted
    ? "no auto-fix was available"
    : record.fix.succeeded
      ? `auto-fixed after ${record.fix.attempts} attempt(s)`
      : `auto-fix FAILED after ${record.fix.attempts} attempt(s) — needs a human`;

  return `[client-error-monitor] ${record.category} for ${record.clientId}: ${record.reason} (${fixStatus})`;
}

/** Notifies over every configured channel. Returns true if at least one succeeded. */
export async function notify(record: ErrorRecord): Promise<boolean> {
  const message = formatMessage(record);
  const [smsSent, pushSent] = await Promise.all([
    sendSms(message),
    sendPush("Client error detected", message),
  ]);
  return smsSent || pushSent;
}

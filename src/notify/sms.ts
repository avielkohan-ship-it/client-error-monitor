import { logger } from "../logger.js";

/**
 * Sends an SMS via Twilio's REST API using plain fetch (no SDK dependency).
 * No-ops if Twilio env vars aren't configured.
 */
export async function sendSms(message: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const toNumber = process.env.NOTIFY_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    logger.warn("SMS notification skipped: Twilio env vars are not fully configured.");
    return false;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({ From: fromNumber, To: toNumber, Body: message });
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!response.ok) {
      logger.error(`Twilio SMS send failed with status ${response.status}`, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    logger.error("Twilio SMS send threw an error", error);
    return false;
  }
}

import { logger } from "../logger.js";

/**
 * Sends a push notification via ntfy.sh (https://ntfy.sh), which needs no
 * account or API key: pick a unique topic name, subscribe to it in the ntfy
 * app, and set NTFY_TOPIC to the same value. No-ops if NTFY_TOPIC isn't set.
 */
export async function sendPush(title: string, message: string): Promise<boolean> {
  const topic = process.env.NTFY_TOPIC;
  const server = process.env.NTFY_SERVER || "https://ntfy.sh";

  if (!topic) {
    logger.warn("Push notification skipped: NTFY_TOPIC is not configured.");
    return false;
  }

  try {
    const response = await fetch(`${server}/${topic}`, {
      method: "POST",
      headers: {
        Title: title,
        Priority: "high",
      },
      body: message,
    });
    if (!response.ok) {
      logger.error(`ntfy push failed with status ${response.status}`, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    logger.error("ntfy push threw an error", error);
    return false;
  }
}

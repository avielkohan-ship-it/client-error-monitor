import { Request, Router } from "express";
import { calcomWebhookToBookingEvent, verifyCalcomSignature } from "../adapters/calcom.js";
import { getClient } from "../clients.js";
import { logger } from "../logger.js";
import { processEvent } from "../pipeline.js";

export const calcomRouter = Router();

/**
 * Point a practice's Cal.com webhook (Settings > Webhooks > Add) at:
 *   https://<your-deployment>/webhooks/calcom/<clientId>
 * with the "Payload Template" left as default and the secret set to match
 * this client's `calcomWebhookSecret` in config/clients.json.
 */
calcomRouter.post("/:clientId", async (req, res) => {
  const { clientId } = req.params;
  const client = getClient(clientId);

  if (!client) {
    return res.status(404).json({ error: `unknown client "${clientId}"` });
  }

  const rawBody = (req as Request & { rawBody?: string }).rawBody ?? "";
  if (client.calcomWebhookSecret) {
    const valid = verifyCalcomSignature(rawBody, req.header("X-Cal-Signature-256"), client.calcomWebhookSecret);
    if (!valid) {
      return res.status(401).json({ error: "invalid Cal.com signature" });
    }
  } else {
    logger.warn(`No calcomWebhookSecret configured for client "${clientId}" — accepting unverified webhook.`);
  }

  const event = calcomWebhookToBookingEvent(clientId, req.body);
  if (!event) {
    return res.status(200).json({ errorDetected: false, ignored: true });
  }

  try {
    const record = await processEvent(event);
    res.status(202).json({ errorDetected: Boolean(record), record: record ?? null });
  } catch (error) {
    logger.error("Failed to process Cal.com webhook", error);
    res.status(500).json({ error: "internal error processing event" });
  }
});

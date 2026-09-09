import { Request, Router } from "express";
import { getClient } from "../clients.js";
import { logger } from "../logger.js";
import { processEvent } from "../pipeline.js";
import { retellWebhookToCallEvent, verifyRetellSignature } from "../adapters/retell.js";

export const retellRouter = Router();

/**
 * Point a practice's Retell AI agent webhook at:
 *   https://<your-deployment>/webhooks/retell/<clientId>
 * with the signing secret set to match this client's `retellWebhookSecret`
 * in config/clients.json.
 */
retellRouter.post("/:clientId", async (req, res) => {
  const { clientId } = req.params;
  const client = getClient(clientId);

  if (!client) {
    return res.status(404).json({ error: `unknown client "${clientId}"` });
  }

  const rawBody = (req as Request & { rawBody?: string }).rawBody ?? "";
  if (client.retellWebhookSecret) {
    const valid = verifyRetellSignature(rawBody, req.header("X-Retell-Signature"), client.retellWebhookSecret);
    if (!valid) {
      return res.status(401).json({ error: "invalid Retell signature" });
    }
  } else {
    logger.warn(`No retellWebhookSecret configured for client "${clientId}" — accepting unverified webhook.`);
  }

  const event = retellWebhookToCallEvent(clientId, req.body);
  if (!event) {
    return res.status(200).json({ errorDetected: false, ignored: true });
  }

  try {
    const record = await processEvent(event);
    res.status(202).json({ errorDetected: Boolean(record), record: record ?? null });
  } catch (error) {
    logger.error("Failed to process Retell webhook", error);
    res.status(500).json({ error: "internal error processing event" });
  }
});

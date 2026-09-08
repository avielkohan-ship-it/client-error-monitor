import { Router } from "express";
import { logger } from "../logger.js";
import { processEvent } from "../pipeline.js";
import { BookingEvent, CallEvent } from "../types.js";

export const webhooksRouter = Router();

function checkSecret(header: string | undefined): boolean {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) return true;
  return header === expected;
}

webhooksRouter.post("/booking", async (req, res) => {
  if (!checkSecret(req.header("X-Webhook-Secret"))) {
    return res.status(401).json({ error: "invalid webhook secret" });
  }

  const body = req.body as Partial<BookingEvent>;
  if (!body.clientId || !body.source || !body.status) {
    return res.status(400).json({ error: "clientId, source and status are required" });
  }

  const event: BookingEvent = {
    type: "booking",
    clientId: body.clientId,
    source: body.source,
    status: body.status,
    patientOrCustomerName: body.patientOrCustomerName,
    requestedTime: body.requestedTime,
    errorMessage: body.errorMessage,
    raw: req.body,
  };

  try {
    const record = await processEvent(event);
    res.status(202).json({ errorDetected: Boolean(record), record: record ?? null });
  } catch (error) {
    logger.error("Failed to process booking webhook", error);
    res.status(500).json({ error: "internal error processing event" });
  }
});

webhooksRouter.post("/call", async (req, res) => {
  if (!checkSecret(req.header("X-Webhook-Secret"))) {
    return res.status(401).json({ error: "invalid webhook secret" });
  }

  const body = req.body as Partial<CallEvent>;
  if (!body.clientId || !body.callId || body.durationSeconds === undefined || !body.endReason) {
    return res
      .status(400)
      .json({ error: "clientId, callId, durationSeconds and endReason are required" });
  }

  const event: CallEvent = {
    type: "call",
    clientId: body.clientId,
    callId: body.callId,
    durationSeconds: body.durationSeconds,
    endReason: body.endReason,
    transcriptSnippet: body.transcriptSnippet,
    raw: req.body,
  };

  try {
    const record = await processEvent(event);
    res.status(202).json({ errorDetected: Boolean(record), record: record ?? null });
  } catch (error) {
    logger.error("Failed to process call webhook", error);
    res.status(500).json({ error: "internal error processing event" });
  }
});

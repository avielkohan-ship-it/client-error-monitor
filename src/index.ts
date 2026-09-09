import express from "express";
import { logger } from "./logger.js";
import { calcomRouter } from "./routes/calcom.js";
import { errorsRouter } from "./routes/errors.js";
import { retellRouter } from "./routes/retell.js";
import { webhooksRouter } from "./routes/webhooks.js";

const app = express();
// Keep the raw request body around (in req.rawBody) so Cal.com/Retell
// webhook signatures, which are computed over the exact bytes sent, can be
// verified — re-serializing the parsed JSON would not reproduce them.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: string }).rawBody = buf.toString("utf-8");
    },
  }),
);

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/webhooks", webhooksRouter);
app.use("/webhooks/calcom", calcomRouter);
app.use("/webhooks/retell", retellRouter);
app.use("/errors", errorsRouter);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  logger.info(`client-error-monitor listening on port ${port}`);
});

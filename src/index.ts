import express from "express";
import { logger } from "./logger.js";
import { errorsRouter } from "./routes/errors.js";
import { webhooksRouter } from "./routes/webhooks.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/webhooks", webhooksRouter);
app.use("/errors", errorsRouter);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  logger.info(`client-error-monitor listening on port ${port}`);
});

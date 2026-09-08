import { Router } from "express";
import { getErrorRecord, listErrorRecords } from "../store.js";

export const errorsRouter = Router();

errorsRouter.get("/", (_req, res) => {
  res.json(listErrorRecords());
});

errorsRouter.get("/:id", (req, res) => {
  const record = getErrorRecord(req.params.id);
  if (!record) return res.status(404).json({ error: "not found" });
  res.json(record);
});

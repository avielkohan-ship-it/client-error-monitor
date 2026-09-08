import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ErrorRecord } from "./types.js";

const DATA_PATH = path.resolve(process.cwd(), "data/errors.json");

function readAll(): ErrorRecord[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}

function writeAll(records: ErrorRecord[]): void {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(records, null, 2));
}

export function saveErrorRecord(record: Omit<ErrorRecord, "id" | "createdAt">): ErrorRecord {
  const full: ErrorRecord = {
    ...record,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const records = readAll();
  records.push(full);
  writeAll(records);
  return full;
}

export function listErrorRecords(): ErrorRecord[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getErrorRecord(id: string): ErrorRecord | undefined {
  return readAll().find((record) => record.id === id);
}

export function updateErrorRecord(id: string, patch: Partial<ErrorRecord>): ErrorRecord | undefined {
  const records = readAll();
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) return undefined;
  records[index] = { ...records[index], ...patch };
  writeAll(records);
  return records[index];
}

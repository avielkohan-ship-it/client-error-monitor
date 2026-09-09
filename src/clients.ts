import fs from "node:fs";
import path from "node:path";
import { logger } from "./logger.js";

export interface ClientConfig {
  id: string;
  displayName?: string;
  bookingSource?: string;
  bookingRetryUrl?: string;
  bookingRetryHeaders?: Record<string, string>;
  callCallbackUrl?: string;
  callCallbackHeaders?: Record<string, string>;
  /** Secret configured on this practice's Cal.com webhook (Settings > Webhooks). */
  calcomWebhookSecret?: string;
  /** Secret used to verify this practice's Retell AI webhook signature. */
  retellWebhookSecret?: string;
}

const CONFIG_PATH = path.resolve(process.cwd(), "config/clients.json");

let cache: Map<string, ClientConfig> | null = null;

function load(): Map<string, ClientConfig> {
  if (cache) return cache;
  cache = new Map();
  if (!fs.existsSync(CONFIG_PATH)) {
    logger.warn(
      `No config/clients.json found (looked at ${CONFIG_PATH}). Copy config/clients.example.json to get started. Auto-fix will be skipped until clients are configured.`,
    );
    return cache;
  }
  const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as {
    clients: ClientConfig[];
  };
  for (const client of parsed.clients ?? []) {
    cache.set(client.id, client);
  }
  return cache;
}

export function getClient(clientId: string): ClientConfig | undefined {
  return load().get(clientId);
}

/** Test-only: clear the cached config so a test can reload it. */
export function resetClientConfigCache(): void {
  cache = null;
}

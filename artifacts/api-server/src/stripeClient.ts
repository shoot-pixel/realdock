/**
 * stripeClient.ts
 *
 * Fetches Stripe credentials from the Replit Stripe Integration connector.
 * Credential field names: `publishable` and `secret` (from connectors v2 API).
 * Falls back from production → development if no production connection exists.
 */

import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

type SettingsItem = { settings?: { publishable?: string; secret?: string } };

async function fetchConnectionData(
  hostname: string,
  xReplitToken: string,
  environment: string,
): Promise<SettingsItem | null> {
  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("environment", environment);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Replit-Token": xReplitToken,
    },
    signal: AbortSignal.timeout(10_000),
  });

  const data = (await response.json()) as { items?: SettingsItem[] };
  return data.items?.[0] ?? null;
}

async function getCredentials(): Promise<{ publishableKey: string; secretKey: string }> {
  const hostname = process.env["REPLIT_CONNECTORS_HOSTNAME"];
  if (!hostname) throw new Error("REPLIT_CONNECTORS_HOSTNAME not set");

  const xReplitToken = process.env["REPL_IDENTITY"]
    ? "repl " + process.env["REPL_IDENTITY"]
    : process.env["WEB_REPL_RENEWAL"]
      ? "depl " + process.env["WEB_REPL_RENEWAL"]
      : null;

  if (!xReplitToken) {
    throw new Error("X-Replit-Token not found (REPL_IDENTITY / WEB_REPL_RENEWAL missing)");
  }

  const isProduction = process.env["REPLIT_DEPLOYMENT"] === "1";
  const primaryEnv = isProduction ? "production" : "development";
  const fallbackEnv = isProduction ? "development" : null;

  let item = await fetchConnectionData(hostname, xReplitToken, primaryEnv);

  if ((!item?.settings?.publishable || !item?.settings?.secret) && fallbackEnv) {
    item = await fetchConnectionData(hostname, xReplitToken, fallbackEnv);
  }

  const settings = item?.settings;

  if (!settings?.publishable || !settings?.secret) {
    throw new Error("Stripe connection not found. Connect Stripe via the Integrations tab.");
  }

  return {
    publishableKey: settings.publishable,
    secretKey: settings.secret,
  };
}

/** Returns a fresh Stripe client. Never cache — tokens rotate. */
export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, { apiVersion: "2026-04-22.dahlia" });
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey(): Promise<string> {
  const { secretKey } = await getCredentials();
  return secretKey;
}

/** Returns a fresh StripeSync instance for webhook processing and data sync. */
export async function getStripeSync(): Promise<StripeSync> {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const { secretKey } = await getCredentials();
  return new StripeSync({
    poolConfig: { connectionString: databaseUrl, max: 2 },
    stripeSecretKey: secretKey,
  });
}

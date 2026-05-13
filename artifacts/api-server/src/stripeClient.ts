/**
 * stripeClient.ts
 *
 * Fetches Stripe credentials from the Replit Stripe Integration.
 *
 * ─── HOW TO CONNECT YOUR STRIPE ACCOUNT ────────────────────────────────────
 *  1. Go to the Integrations tab in the Replit workspace sidebar.
 *  2. Search for "Stripe" and click Connect.
 *  3. Follow the OAuth prompts to link your Stripe account.
 *  4. Once connected, restart the API Server workflow.
 *
 * Replit injects the credentials automatically — no .env editing needed.
 * ────────────────────────────────────────────────────────────────────────────
 */

import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

async function getStripeCredentials(): Promise<{ secretKey: string; webhookSecret?: string }> {
  const hostname = process.env["REPLIT_CONNECTORS_HOSTNAME"];
  const xReplitToken = process.env["REPL_IDENTITY"]
    ? "repl " + process.env["REPL_IDENTITY"]
    : process.env["WEB_REPL_RENEWAL"]
      ? "depl " + process.env["WEB_REPL_RENEWAL"]
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      "Stripe integration not connected. " +
        "Open the Integrations tab in Replit and connect your Stripe account.",
    );
  }

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!resp.ok) {
    throw new Error(`Failed to fetch Stripe credentials: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json() as { items?: Array<{ settings?: { secret_key?: string; webhook_secret?: string } }> };
  const settings = data.items?.[0]?.settings;

  if (!settings?.secret_key) {
    throw new Error(
      "Stripe integration missing secret key. " +
        "Connect Stripe via the Integrations tab in Replit.",
    );
  }

  return {
    secretKey: settings.secret_key,
    webhookSecret: settings.webhook_secret,
  };
}

/** Returns a fresh authenticated Stripe client (not cached — tokens rotate). */
export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

/** Returns a fresh StripeSync instance for webhook processing and data sync. */
export async function getStripeSync(): Promise<StripeSync> {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const { secretKey, webhookSecret } = await getStripeCredentials();
  return new StripeSync({
    poolConfig: { connectionString: databaseUrl },
    stripeSecretKey: secretKey,
    stripeWebhookSecret: webhookSecret ?? "",
  });
}

/**
 * Stripe client for scripts — same credential fetching as the API server.
 *
 * Tries the production Stripe connection first, falls back to development.
 * This means seed-products always targets the live Stripe account when
 * production credentials are available.
 *
 * ─── HOW TO CONNECT ────────────────────────────────────────────────────────
 *  Open the Integrations tab in Replit → search "Stripe" → click Connect.
 * ───────────────────────────────────────────────────────────────────────────
 */

import Stripe from "stripe";

async function fetchConnection(
  hostname: string,
  token: string,
  environment: string,
): Promise<{ secret?: string } | null> {
  const url = `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe&environment=${environment}`;
  const resp = await fetch(url, {
    headers: { Accept: "application/json", "X-Replit-Token": token },
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) return null;
  const data = await resp.json() as { items?: Array<{ settings?: { secret?: string } }> };
  return data.items?.[0]?.settings ?? null;
}

async function getStripeCredentials(): Promise<{ secretKey: string; environment: string }> {
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

  // When STRIPE_USE_SANDBOX=true, use sandbox (development) keys only
  const forceSandbox = process.env["STRIPE_USE_SANDBOX"] === "true";
  const envOrder = forceSandbox ? ["development"] : ["production", "development"];

  for (const env of envOrder) {
    const settings = await fetchConnection(hostname, xReplitToken, env);
    if (settings?.secret) {
      return { secretKey: settings.secret, environment: env };
    }
  }

  throw new Error(
    "Stripe integration missing secret key. Connect Stripe via the Integrations tab.",
  );
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey, environment } = await getStripeCredentials();
  console.log(`Using Stripe ${environment} credentials.`);
  return new Stripe(secretKey);
}

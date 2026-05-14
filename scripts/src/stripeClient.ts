/**
 * Stripe client for scripts — same credential fetching as the API server.
 *
 * ─── HOW TO CONNECT ────────────────────────────────────────────────────────
 *  Open the Integrations tab in Replit → search "Stripe" → click Connect.
 * ───────────────────────────────────────────────────────────────────────────
 */

import Stripe from "stripe";

async function getStripeCredentials(): Promise<{ secretKey: string }> {
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
      headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!resp.ok) {
    throw new Error(`Failed to fetch Stripe credentials: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json() as { items?: Array<{ settings?: { secret?: string } }> };
  const settings = data.items?.[0]?.settings;

  if (!settings?.secret) {
    throw new Error(
      "Stripe integration missing secret key. Connect Stripe via the Integrations tab.",
    );
  }

  return { secretKey: settings.secret };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

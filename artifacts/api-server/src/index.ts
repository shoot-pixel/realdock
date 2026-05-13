import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";

/**
 * Initialize the Stripe schema and start syncing data.
 *
 * This is intentionally graceful — if Stripe is not yet connected,
 * the server still starts normally and stripe routes return a 503.
 *
 * ─── TO CONNECT STRIPE ────────────────────────────────────────────────────
 *  Open the Integrations tab in Replit → search "Stripe" → click Connect.
 *  Then restart the API Server workflow.
 * ──────────────────────────────────────────────────────────────────────────
 */
async function initStripe(): Promise<void> {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    logger.warn("DATABASE_URL missing — skipping Stripe init");
    return;
  }

  try {
    logger.info("Initializing Stripe schema…");
    await runMigrations({ databaseUrl });

    const stripeSync = await getStripeSync();

    // Register webhook endpoint and run backfill in background
    stripeSync
      .syncBackfill()
      .then(() => logger.info("Stripe backfill complete"))
      .catch((err: unknown) => logger.error({ err }, "Stripe backfill failed"));
  } catch (err) {
    // Not connected yet — this is expected until Stripe is linked via Integrations tab
    logger.warn(
      { err },
      "Stripe not connected — payments disabled. " +
        "Connect Stripe via the Integrations tab in Replit to enable.",
    );
  }
}

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

await initStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

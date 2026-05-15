import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

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

    // Pre-create all enum types that stripe-replit-sync migrations depend on.
    // pg-node-migrations sends each SQL file as one multi-statement simple query,
    // causing PostgreSQL to resolve type references at parse time — before the
    // DO $$ block that creates the type has executed. Pre-creating them here
    // ensures types exist when the migrations run.
    await db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS stripe`));
    await db.execute(sql.raw(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = 'invoice_status' AND n.nspname = 'stripe') THEN
          CREATE TYPE stripe.invoice_status AS ENUM ('draft', 'open', 'paid', 'uncollectible', 'void');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = 'pricing_tiers' AND n.nspname = 'stripe') THEN
          CREATE TYPE stripe.pricing_tiers AS ENUM ('graduated', 'volume');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = 'pricing_type' AND n.nspname = 'stripe') THEN
          CREATE TYPE stripe.pricing_type AS ENUM ('one_time', 'recurring');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = 'subscription_status' AND n.nspname = 'stripe') THEN
          CREATE TYPE stripe.subscription_status AS ENUM ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = 'subscription_schedule_status' AND n.nspname = 'stripe') THEN
          CREATE TYPE stripe.subscription_schedule_status AS ENUM ('not_started', 'active', 'completed', 'released', 'canceled');
        END IF;
      END $$
    `));

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

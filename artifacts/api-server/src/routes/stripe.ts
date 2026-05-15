import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../lib/auth";
import { stripeStorage } from "../stripeStorage";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router = Router();

const STRIPE_UNAVAILABLE = {
  error: "Stripe not configured",
  hint: "Payment Account Not Configured. Contact Support",
};

/** GET /api/stripe/subscription — current user's subscription */
router.get("/stripe/subscription", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await stripeStorage.getUser(req.userId!);
    if (!user?.stripeSubscriptionId) {
      return res.json({ subscription: null });
    }
    const subscription = await stripeStorage.getSubscription(user.stripeSubscriptionId);
    return res.json({ subscription });
  } catch (err) {
    req.log.error({ err }, "stripe/subscription error");
    return res.status(503).json(STRIPE_UNAVAILABLE);
  }
});

/** GET /api/stripe/products — list active products with prices */
router.get("/stripe/products", async (req, res) => {
  try {
    const rows = await stripeStorage.listActiveProducts();

    const map = new Map<string, { id: string; name: string; description: string | null; metadata: Record<string, string>; prices: object[] }>();
    for (const row of rows as Record<string, unknown>[]) {
      const pid = row["product_id"] as string;
      if (!map.has(pid)) {
        map.set(pid, {
          id: pid,
          name: row["product_name"] as string,
          description: (row["product_description"] as string) ?? null,
          metadata: (row["product_metadata"] as Record<string, string>) ?? {},
          prices: [],
        });
      }
      if (row["price_id"]) {
        map.get(pid)!.prices.push({
          id: row["price_id"],
          unitAmount: row["unit_amount"],
          currency: row["currency"],
          recurring: row["recurring"],
        });
      }
    }

    return res.json({ data: Array.from(map.values()) });
  } catch (err) {
    req.log.error({ err }, "stripe/products error");
    return res.status(503).json(STRIPE_UNAVAILABLE);
  }
});

const checkoutSchema = z.object({ planKey: z.enum(["starter", "pro", "studio"]) });

/** Number of free trial days per plan key (0 / omit = no trial) */
const TRIAL_DAYS: Partial<Record<string, number>> = { starter: 7 };

/**
 * Find the monthly price ID for a plan by querying the Stripe API directly.
 * This bypasses the stripe-replit-sync DB tables entirely so it works even
 * when the backfill hasn't populated local tables yet.
 */
async function getPriceIdFromStripe(stripe: Awaited<ReturnType<typeof getUncachableStripeClient>>, planKey: string): Promise<string | null> {
  // Search for the product by plan_key metadata
  const products = await stripe.products.search({
    query: `metadata['plan_key']:'${planKey}' AND active:'true'`,
    limit: 1,
  });
  const product = products.data[0];
  if (!product) return null;

  // Find the active monthly price for this product
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    type: "recurring",
    limit: 10,
  });
  const monthly = prices.data.find(p => p.recurring?.interval === "month");
  return monthly?.id ?? null;
}

/** POST /api/stripe/checkout — create a Stripe Checkout session */
router.post("/stripe/checkout", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "planKey must be 'starter', 'pro', or 'studio'" });
    }

    const { planKey } = parsed.data;
    const user = await stripeStorage.getUser(req.userId!);
    if (!user) return res.status(404).json({ error: "User not found" });

    const stripe = await getUncachableStripeClient();

    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: String(user.id) },
      });
      await stripeStorage.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    // Query Stripe API directly — avoids dependency on the local DB backfill
    const priceId = await getPriceIdFromStripe(stripe, planKey);
    if (!priceId) {
      req.log.error({ planKey }, "No active price found in Stripe for plan");
      return res.status(404).json({
        error: `No active price found for plan "${planKey}".`,
        hint: "Contact support or try again shortly.",
      });
    }

    const host = `${req.protocol}://${req.get("host")}`;
    const trialDays = TRIAL_DAYS[planKey];

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${host}/settings?checkout=success`,
      cancel_url: `${host}/settings?checkout=cancel`,
      ...(trialDays ? { subscription_data: { trial_period_days: trialDays } } : {}),
    });

    return res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "stripe/checkout error");
    return res.status(503).json(STRIPE_UNAVAILABLE);
  }
});

/** POST /api/stripe/portal — open Stripe Customer Portal */
router.post("/stripe/portal", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await stripeStorage.getUser(req.userId!);
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ error: "No billing account found" });
    }

    const stripe = await getUncachableStripeClient();
    const host = `${req.protocol}://${req.get("host")}`;
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${host}/settings`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "stripe/portal error");
    return res.status(503).json(STRIPE_UNAVAILABLE);
  }
});

/** POST /api/stripe/cancel — cancel subscription at period end */
router.post("/stripe/cancel", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await stripeStorage.getUser(req.userId!);
    if (!user?.stripeSubscriptionId) {
      return res.status(400).json({ error: "No active subscription found" });
    }

    const stripe = await getUncachableStripeClient();
    const sub = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return res.json({ success: true, cancelAt: sub.cancel_at });
  } catch (err) {
    req.log.error({ err }, "stripe/cancel error");
    return res.status(503).json(STRIPE_UNAVAILABLE);
  }
});

/** POST /api/stripe/reactivate — undo a scheduled cancellation */
router.post("/stripe/reactivate", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await stripeStorage.getUser(req.userId!);
    if (!user?.stripeSubscriptionId) {
      return res.status(400).json({ error: "No subscription found" });
    }

    const stripe = await getUncachableStripeClient();
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "stripe/reactivate error");
    return res.status(503).json(STRIPE_UNAVAILABLE);
  }
});

export default router;

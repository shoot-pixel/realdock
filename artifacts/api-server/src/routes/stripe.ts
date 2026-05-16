import { Router } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { requireAuth, type AuthenticatedRequest } from "../lib/auth";
import { stripeStorage } from "../stripeStorage";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";
import { logger } from "../lib/logger";

const router = Router();

const STRIPE_UNAVAILABLE = {
  error: "Stripe not configured",
  hint: "Payment Account Not Configured. Contact Support",
};

const PLAN_ORDER: Record<string, number> = { free: 0, starter: 1, pro: 2, studio: 3 };

type StripeClient = Awaited<ReturnType<typeof getUncachableStripeClient>>;

/**
 * Returns a valid Stripe customer ID for the user.
 * Self-heals stale IDs from different environments (dev vs prod).
 */
async function ensureStripeCustomer(
  stripe: StripeClient,
  user: NonNullable<Awaited<ReturnType<typeof stripeStorage.getUser>>>,
): Promise<string> {
  if (user.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!existing.deleted) return user.stripeCustomerId;
      logger.warn({ customerId: user.stripeCustomerId, userId: user.id }, "Stripe customer deleted, creating new");
    } catch (err) {
      const isNotFound =
        err instanceof Stripe.errors.StripeInvalidRequestError && err.code === "resource_missing";
      if (!isNotFound) throw err;
      logger.warn({ customerId: user.stripeCustomerId, userId: user.id }, "Stale Stripe customer ID, creating new");
    }
    await stripeStorage.updateUserStripeInfo(user.id, { stripeCustomerId: null, stripeSubscriptionId: null });
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: String(user.id) },
  });
  await stripeStorage.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
  return customer.id;
}

/**
 * Find the active monthly price ID for a plan by querying the Stripe API directly.
 * Bypasses stripe-replit-sync DB tables so it works even without a backfill.
 */
async function getPriceIdFromStripe(stripe: StripeClient, planKey: string): Promise<string | null> {
  const products = await stripe.products.search({
    query: `metadata['plan_key']:'${planKey}' AND active:'true'`,
    limit: 1,
  });
  const product = products.data[0];
  if (!product) return null;

  const prices = await stripe.prices.list({ product: product.id, active: true, type: "recurring", limit: 10 });
  return prices.data.find(p => p.recurring?.interval === "month")?.id ?? null;
}

/** GET /api/stripe/config — returns publishable key for frontend Stripe.js */
router.get("/stripe/config", async (_req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    return res.json({ publishableKey });
  } catch (err) {
    logger.error({ err }, "stripe/config error");
    return res.status(503).json(STRIPE_UNAVAILABLE);
  }
});

/** GET /api/stripe/subscription — current user's live subscription from Stripe API */
router.get("/stripe/subscription", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await stripeStorage.getUser(req.userId!);
    if (!user?.stripeSubscriptionId) {
      return res.json({ subscription: null });
    }
    const stripe = await getUncachableStripeClient();
    try {
      const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

      // Detect pending plan change from an attached subscription schedule
      let pendingPlanChange: { plan: string; effectiveAt: number } | null = null;
      if (sub.schedule) {
        try {
          const scheduleId = typeof sub.schedule === "string" ? sub.schedule : (sub.schedule as { id: string }).id;
          const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
          if (schedule.status === "active" && schedule.phases.length >= 2) {
            const nextPhase = schedule.phases[1];
            const nextItem = nextPhase?.items?.[0];
            if (nextItem && nextPhase.start_date) {
              const priceIdOrObj = nextItem.price;
              const priceId = typeof priceIdOrObj === "string" ? priceIdOrObj : (priceIdOrObj as { id: string }).id;
              const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
              const product = price.product as Stripe.Product;
              const planKey = product.metadata?.["plan_key"];
              if (planKey) {
                pendingPlanChange = { plan: planKey, effectiveAt: nextPhase.start_date };
              }
            }
          }
        } catch { /* non-fatal — don't surface schedule errors to users */ }
      }

      return res.json({
        subscription: {
          status: sub.status,
          cancel_at_period_end: sub.cancel_at_period_end,
          // In API 2026-04-22.dahlia, current_period_end was removed.
          // When cancel_at_period_end is true, Stripe sets cancel_at = period end.
          current_period_end: sub.cancel_at ?? 0,
          trial_end: sub.trial_end,
          pendingPlanChange,
        },
      });
    } catch {
      return res.json({ subscription: null });
    }
  } catch (err) {
    req.log.error({ err }, "stripe/subscription error");
    return res.status(503).json(STRIPE_UNAVAILABLE);
  }
});

/** GET /api/stripe/products — list active products with prices */
router.get("/stripe/products", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const planKeys = ["starter", "pro", "studio"];
    const products = [];

    for (const planKey of planKeys) {
      const found = await stripe.products.search({
        query: `metadata['plan_key']:'${planKey}' AND active:'true'`,
        limit: 1,
      });
      const product = found.data[0];
      if (!product) continue;
      const prices = await stripe.prices.list({ product: product.id, active: true, type: "recurring", limit: 10 });
      products.push({
        id: product.id,
        name: product.name,
        description: product.description,
        metadata: product.metadata,
        prices: prices.data.map(p => ({
          id: p.id,
          unitAmount: p.unit_amount,
          currency: p.currency,
          recurring: p.recurring,
        })),
      });
    }

    return res.json({ data: products });
  } catch (err) {
    req.log.error({ err }, "stripe/products error");
    return res.status(503).json(STRIPE_UNAVAILABLE);
  }
});

const checkoutSchema = z.object({
  planKey: z.enum(["starter", "pro", "studio"]),
  billingInterval: z.enum(["month", "year"]).default("month"),
});
const TRIAL_DAYS: Partial<Record<string, number>> = { starter: 7 };

// Annual price in cents: monthly × 12 × 0.9 (10% off)
const ANNUAL_PRICE_CENTS: Record<string, number> = {
  pro: 52920,     // $49 × 12 × 0.9 = $529.20
  studio: 139320, // $129 × 12 × 0.9 = $1,393.20
};

/**
 * Finds the existing annual price for a plan, or creates one at 10% off annual.
 * Only Pro and Studio support annual billing.
 */
async function getOrCreateAnnualPrice(stripe: StripeClient, planKey: string): Promise<string | null> {
  const annualCents = ANNUAL_PRICE_CENTS[planKey];
  if (!annualCents) return null; // Starter doesn't have annual pricing

  const products = await stripe.products.search({
    query: `metadata['plan_key']:'${planKey}' AND active:'true'`,
    limit: 1,
  });
  const product = products.data[0];
  if (!product) return null;

  const prices = await stripe.prices.list({ product: product.id, active: true, type: "recurring", limit: 20 });
  const existing = prices.data.find(p => p.recurring?.interval === "year");
  if (existing) return existing.id;

  // Create the annual price
  const newPrice = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: annualCents,
    recurring: { interval: "year" },
    metadata: { plan_key: planKey, billing: "annual", discount: "10pct" },
  });
  logger.info({ planKey, priceId: newPrice.id, annualCents }, "Created annual Stripe price");
  return newPrice.id;
}

/** POST /api/stripe/create-embedded-checkout — creates session for in-app embedded checkout */
router.post("/stripe/create-embedded-checkout", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "planKey must be 'starter', 'pro', or 'studio'" });
    }

    const { planKey, billingInterval } = parsed.data;
    const user = await stripeStorage.getUser(req.userId!);
    if (!user) return res.status(404).json({ error: "User not found" });

    const stripe = await getUncachableStripeClient();
    const customerId = await ensureStripeCustomer(stripe, user);

    // For annual billing (Pro/Studio only), find or create the annual price
    const priceId = billingInterval === "year"
      ? await getOrCreateAnnualPrice(stripe, planKey)
      : await getPriceIdFromStripe(stripe, planKey);

    if (!priceId) {
      return res.status(404).json({ error: `No active price found for plan "${planKey}" (${billingInterval}).` });
    }

    const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0];
    const host = domain ? `https://${domain}` : `${req.protocol}://${req.get("host")}`;
    // Only offer trial on monthly Starter
    const trialDays = billingInterval === "month" ? TRIAL_DAYS[planKey] : undefined;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      ui_mode: "embedded_page",
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      return_url: `${host}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      ...(trialDays ? { subscription_data: { trial_period_days: trialDays } } : {}),
    });

    return res.json({ clientSecret: session.client_secret });
  } catch (err) {
    logger.error({ err }, "stripe/create-embedded-checkout error");
    return res.status(503).json(STRIPE_UNAVAILABLE);
  }
});

/** GET /api/stripe/checkout-session/:sessionId — check session status for return page */
router.get("/stripe/checkout-session/:sessionId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId as string);
    return res.json({
      status: session.status,
      customerEmail: session.customer_details?.email,
    });
  } catch (err) {
    req.log.error({ err }, "stripe/checkout-session error");
    return res.status(503).json(STRIPE_UNAVAILABLE);
  }
});

const changePlanSchema = z.object({ planKey: z.enum(["starter", "pro", "studio"]) });

/** POST /api/stripe/change-plan — upgrade (immediate) or downgrade (scheduled at period end) */
router.post("/stripe/change-plan", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = changePlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "planKey must be 'starter', 'pro', or 'studio'" });
    }

    const { planKey } = parsed.data;
    const user = await stripeStorage.getUser(req.userId!);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.stripeSubscriptionId) {
      return res.status(400).json({ error: "No active subscription. Please subscribe first." });
    }

    const stripe = await getUncachableStripeClient();

    const newPriceId = await getPriceIdFromStripe(stripe, planKey);
    if (!newPriceId) {
      return res.status(404).json({ error: `Plan "${planKey}" not found in Stripe.` });
    }

    const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    const currentItem = sub.items.data[0];
    if (!currentItem) return res.status(400).json({ error: "Subscription has no items" });

    const currentPlanOrder = PLAN_ORDER[user.plan] ?? 0;
    const newPlanOrder = PLAN_ORDER[planKey] ?? 0;
    const isUpgrade = newPlanOrder > currentPlanOrder;

    if (isUpgrade) {
      // Immediate upgrade with proration
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        items: [{ id: currentItem.id, price: newPriceId }],
        proration_behavior: "create_prorations",
      });
      await stripeStorage.updateUserPlan(user.id, planKey as "starter" | "pro" | "studio");
      return res.json({ success: true, effective: "immediate", plan: planKey });
    } else {
      // Downgrade: schedule change at end of current billing period
      // Create a subscription schedule from the existing subscription.
      // current_phase.end_date gives the end of the current billing period.
      const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: user.stripeSubscriptionId,
      });
      const periodEnd = schedule.current_phase!.end_date;
      await stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: "release",
        phases: [
          {
            items: [{ price: currentItem.price.id }],
            start_date: schedule.current_phase!.start_date,
            end_date: periodEnd,
          },
          {
            items: [{ price: newPriceId }],
          },
        ],
      });
      return res.json({
        success: true,
        effective: "period_end",
        effectiveAt: periodEnd,
        plan: planKey,
      });
    }
  } catch (err) {
    logger.error({ err }, "stripe/change-plan error");
    return res.status(503).json(STRIPE_UNAVAILABLE);
  }
});

/** POST /api/stripe/checkout — legacy redirect checkout (kept for compatibility) */
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
    const customerId = await ensureStripeCustomer(stripe, user);

    const priceId = await getPriceIdFromStripe(stripe, planKey);
    if (!priceId) {
      return res.status(404).json({ error: `No active price found for plan "${planKey}".` });
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
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: "No billing account found" });
    }

    const stripe = await getUncachableStripeClient();

    try {
      const existing = await stripe.customers.retrieve(user.stripeCustomerId);
      if (existing.deleted) {
        await stripeStorage.updateUserStripeInfo(user.id, { stripeCustomerId: null, stripeSubscriptionId: null });
        return res.status(400).json({ error: "No billing account found" });
      }
    } catch (err) {
      const isNotFound =
        err instanceof Stripe.errors.StripeInvalidRequestError && err.code === "resource_missing";
      if (isNotFound) {
        await stripeStorage.updateUserStripeInfo(user.id, { stripeCustomerId: null, stripeSubscriptionId: null });
        return res.status(400).json({ error: "No billing account found" });
      }
      throw err;
    }

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

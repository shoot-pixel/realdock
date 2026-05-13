import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../lib/auth";
import { stripeStorage } from "../stripeStorage";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router = Router();

const STRIPE_UNAVAILABLE = {
  error: "Stripe not configured",
  hint: "Connect your Stripe account via the Integrations tab in Replit.",
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

const checkoutSchema = z.object({ planKey: z.enum(["pro", "studio"]) });

/** POST /api/stripe/checkout — create a Stripe Checkout session */
router.post("/stripe/checkout", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "planKey must be 'pro' or 'studio'" });
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

    const priceId = await stripeStorage.getPriceIdForPlan(planKey);
    if (!priceId) {
      return res.status(404).json({
        error: `No active price found for plan "${planKey}". Run the seed-products script first.`,
      });
    }

    const host = `${req.protocol}://${req.get("host")}`;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${host}/settings?checkout=success`,
      cancel_url: `${host}/settings?checkout=cancel`,
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

export default router;

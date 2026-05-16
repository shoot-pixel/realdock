import Stripe from "stripe";
import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { stripeStorage } from "./stripeStorage";
import { logger } from "./lib/logger";

/** Derive the plan key from a subscription, fetching product metadata from Stripe. */
async function getPlanKeyFromSubscription(
  stripe: Stripe,
  subscriptionId: string,
): Promise<"starter" | "pro" | "studio" | null> {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price.product"],
    });
    const item = sub.items.data[0];
    if (!item) return null;
    const product = item.price.product as Stripe.Product;
    const planKey = product.metadata?.["plan_key"];
    if (!planKey || !["starter", "pro", "studio"].includes(planKey)) return null;
    return planKey as "starter" | "pro" | "studio";
  } catch (err) {
    logger.error({ err, subscriptionId }, "Could not derive plan from subscription");
    return null;
  }
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "Webhook payload must be a Buffer. " +
          "Ensure the webhook route is registered BEFORE app.use(express.json()).",
      );
    }

    // 1. Let stripe-replit-sync handle and verify the event
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    // 2. Parse the verified event to update public.users.plan
    let event: Stripe.Event;
    try {
      event = JSON.parse(payload.toString()) as Stripe.Event;
    } catch {
      return; // malformed — sync already validated, so this shouldn't happen
    }

    const stripe = await getUncachableStripeClient();

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          if (!session.customer || !session.subscription) break;

          const customerId =
            typeof session.customer === "string" ? session.customer : session.customer.id;
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;

          const user = await stripeStorage.getUserByStripeCustomerId(customerId);
          if (!user) break;

          const planKey = await getPlanKeyFromSubscription(stripe, subscriptionId);
          if (planKey) {
            await stripeStorage.updateUserPlan(user.id, planKey);
            await stripeStorage.updateUserStripeInfo(user.id, { stripeSubscriptionId: subscriptionId });
            logger.info({ userId: user.id, planKey, subscriptionId }, "Plan activated via checkout");
          }
          break;
        }

        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          const customerId =
            typeof sub.customer === "string" ? sub.customer : sub.customer.id;

          const user = await stripeStorage.getUserByStripeCustomerId(customerId);
          if (!user) break;

          const planKey = await getPlanKeyFromSubscription(stripe, sub.id);
          if (planKey) {
            await stripeStorage.updateUserPlan(user.id, planKey);
            logger.info({ userId: user.id, planKey, status: sub.status }, "Plan updated via subscription");
          }
          break;
        }

        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const customerId =
            typeof sub.customer === "string" ? sub.customer : sub.customer.id;

          const user = await stripeStorage.getUserByStripeCustomerId(customerId);
          if (!user) break;

          await stripeStorage.updateUserPlan(user.id, "free");
          await stripeStorage.updateUserStripeInfo(user.id, { stripeSubscriptionId: null });
          logger.info({ userId: user.id }, "Plan reset to free via subscription deleted");
          break;
        }

        default:
          break;
      }
    } catch (err) {
      // Log but don't rethrow — Stripe already got its 200 from sync.processWebhook
      logger.error({ err, eventType: event.type }, "Error updating user plan from webhook");
    }
  }
}

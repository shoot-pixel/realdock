/**
 * seed-products.ts
 *
 * Creates the RealDock subscription products and prices in Stripe.
 * Safe to run multiple times — checks for existing products first.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run seed-products
 */

import { getUncachableStripeClient } from "./stripeClient";

const PLANS = [
  {
    planKey: "starter",
    name: "Starter",
    description: "5 active projects · Public galleries · Standard support · 7-day free trial",
    monthlyAmount: 999,    // $9.99
    yearlyAmount: 9590,    // $95.90 (~20% off)
  },
  {
    planKey: "pro",
    name: "Pro",
    description: "50 GB storage · 200 AI credits/mo · Unlimited projects · Client analytics",
    monthlyAmount: 4900,   // $49.00
    yearlyAmount: 47040,   // $470.40 (~20% off)
  },
  {
    planKey: "studio",
    name: "Studio",
    description: "500 GB storage · 2,000 AI credits/mo · White-label portal · Team members · API access",
    monthlyAmount: 12900,  // $129.00
    yearlyAmount: 123840,  // $1,238.40 (~20% off)
  },
] as const;

async function seedProducts() {
  const stripe = await getUncachableStripeClient();
  console.log("Connected to Stripe. Seeding RealDock products…\n");

  for (const plan of PLANS) {
    const existing = await stripe.products.search({
      query: `metadata['plan_key']:'${plan.planKey}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      const product = existing.data[0]!;
      console.log(`✓ ${plan.name} plan already exists (${product.id}) — skipping.`);
      continue;
    }

    const product = await stripe.products.create({
      name: `RealDock ${plan.name}`,
      description: plan.description,
      metadata: { plan_key: plan.planKey },
    });
    console.log(`Created product: ${product.name} (${product.id})`);

    const monthly = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.monthlyAmount,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { plan_key: plan.planKey, billing: "monthly" },
    });
    console.log(`  Monthly: $${plan.monthlyAmount / 100}/mo (${monthly.id})`);

    const yearly = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.yearlyAmount,
      currency: "usd",
      recurring: { interval: "year" },
      metadata: { plan_key: plan.planKey, billing: "yearly" },
    });
    console.log(`  Yearly:  $${plan.yearlyAmount / 100}/yr (${yearly.id})`);
    console.log();
  }

  console.log("✓ Done. Stripe webhooks will sync products to your database automatically.");
}

seedProducts().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

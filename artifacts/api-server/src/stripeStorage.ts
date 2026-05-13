import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

/** Queries Stripe data from the stripe.* schema (managed by stripe-replit-sync). */
export class StripeStorage {
  async getUser(id: number) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user ?? null;
  }

  async updateUserStripeInfo(
    userId: number,
    info: { stripeCustomerId?: string | null; stripeSubscriptionId?: string | null },
  ) {
    const [user] = await db
      .update(usersTable)
      .set(info)
      .where(eq(usersTable.id, userId))
      .returning();
    return user;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`,
    );
    return result.rows[0] ?? null;
  }

  async listActiveProducts() {
    const result = await db.execute(
      sql`
        SELECT
          p.id            AS product_id,
          p.name          AS product_name,
          p.description   AS product_description,
          p.metadata      AS product_metadata,
          pr.id           AS price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active       AS price_active
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY pr.unit_amount ASC
      `,
    );
    return result.rows;
  }

  /** Find the monthly price for a given plan_key (stored in product metadata). */
  async getPriceIdForPlan(planKey: string) {
    const result = await db.execute(
      sql`
        SELECT pr.id
        FROM stripe.prices pr
        JOIN stripe.products p ON pr.product = p.id
        WHERE p.metadata->>'plan_key' = ${planKey}
          AND pr.active = true
          AND p.active = true
          AND pr.recurring->>'interval' = 'month'
        LIMIT 1
      `,
    );
    return (result.rows[0] as { id?: string } | undefined)?.id ?? null;
  }
}

export const stripeStorage = new StripeStorage();

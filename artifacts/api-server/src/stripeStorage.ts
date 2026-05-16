import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/** Queries Stripe data from the stripe.* schema (managed by stripe-replit-sync). */
export class StripeStorage {
  async getUser(id: number) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user ?? null;
  }

  async getUserByStripeCustomerId(customerId: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.stripeCustomerId, customerId));
    return user ?? null;
  }

  async getUserByStripeSubscriptionId(subscriptionId: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.stripeSubscriptionId, subscriptionId));
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

  async updateUserPlan(userId: number, plan: "free" | "starter" | "pro" | "studio") {
    await db.update(usersTable).set({ plan }).where(eq(usersTable.id, userId));
  }
}

export const stripeStorage = new StripeStorage();

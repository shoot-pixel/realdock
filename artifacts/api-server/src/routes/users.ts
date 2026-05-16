import { Router, type IRouter } from "express";
import { eq, count, sum, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  projectsTable,
  aiJobsTable,
  mediaAssetsTable,
  galleriesTable,
  galleryMediaTable,
  commentsTable,
  favoritesTable,
  clientsTable,
} from "@workspace/db";
import { UpdateCurrentUserBody } from "@workspace/api-zod";
import { requireAuth, AuthenticatedRequest } from "../lib/auth";
import { stripeStorage } from "../stripeStorage";
import { getUncachableStripeClient } from "../stripeClient";

const router: IRouter = Router();

const PLAN_FEATURES: Record<string, string[]> = {
  free:    ["2GB Storage", "5 Projects", "Basic galleries"],
  starter: ["2GB Storage", "5 Projects", "Public galleries", "Standard support"],
  pro:     ["100GB Storage", "20 Projects", "All AI Tools", "Private Galleries", "Custom Branding", "Priority Support"],
  studio:  ["500GB Storage", "Unlimited Projects", "All AI Tools", "White-Label Galleries", "API Access", "Dedicated Support", "Team Members"],
};

const PLAN_STORAGE: Record<string, number> = { free: 2048, starter: 2048, pro: 102400, studio: 512000 };
const PLAN_AI_CREDITS: Record<string, number> = { free: 0, starter: 0, pro: 100, studio: 2000 };
const PLAN_PROJECTS: Record<string, number | null> = { free: 5, starter: 5, pro: 20, studio: null };

router.patch("/users/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = UpdateCurrentUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, req.userId!)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    businessName: user.businessName,
    plan: user.plan,
    createdAt: user.createdAt.toISOString(),
  });
});

router.get("/users/me/subscription", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const plan = user.plan;
  const [projectStats] = await db.select({ cnt: count() }).from(projectsTable).where(eq(projectsTable.userId, req.userId!));
  const projectsUsed = Number(projectStats?.cnt ?? 0);

  let storageUsedMb = 0;
  const ownProjects = await db.select({ id: projectsTable.id }).from(projectsTable).where(eq(projectsTable.userId, req.userId!));
  for (const p of ownProjects) {
    const [s] = await db.select({ total: sum(mediaAssetsTable.sizeMb) }).from(mediaAssetsTable).where(eq(mediaAssetsTable.projectId, p.id));
    storageUsedMb += Number(s?.total ?? 0);
  }

  const [aiCreditStats] = await db.select({ total: sum(aiJobsTable.creditsUsed) }).from(aiJobsTable);
  const aiCreditsUsed = Number(aiCreditStats?.total ?? 0);

  const renewalDate = new Date();
  renewalDate.setMonth(renewalDate.getMonth() + 1);

  res.json({
    plan,
    status: "active",
    storageUsedMb,
    storageLimitMb: PLAN_STORAGE[plan] ?? 2048,
    aiCreditsUsed,
    aiCreditsLimit: PLAN_AI_CREDITS[plan] ?? 0,
    projectsUsed,
    projectsLimit: PLAN_PROJECTS[plan] ?? null,
    renewalDate: renewalDate.toISOString(),
    features: PLAN_FEATURES[plan] ?? [],
  });
});

/** DELETE /api/users/me/media — delete all media assets for the authenticated user */
router.delete("/users/me/media", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const projects = await db.select({ id: projectsTable.id }).from(projectsTable).where(eq(projectsTable.userId, req.userId!));

  if (projects.length === 0) {
    res.json({ deleted: 0 });
    return;
  }

  const projectIds = projects.map(p => p.id);
  const deleted = await db
    .delete(mediaAssetsTable)
    .where(inArray(mediaAssetsTable.projectId, projectIds))
    .returning({ id: mediaAssetsTable.id });

  res.json({ deleted: deleted.length });
});

/** DELETE /api/users/me — permanently delete account and all associated data */
router.delete("/users/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Block deletion if user has an active paid subscription
  if (user.stripeSubscriptionId) {
    try {
      const stripe = await getUncachableStripeClient();
      const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      const isActive = ["active", "trialing"].includes(sub.status);
      if (isActive && !sub.cancel_at_period_end) {
        res.status(400).json({
          error: "Please cancel your subscription first before deleting your account.",
          code: "ACTIVE_SUBSCRIPTION",
        });
        return;
      }
      // cancel_at is set to the period end when cancel_at_period_end is true
      if (isActive && sub.cancel_at_period_end && sub.cancel_at) {
        const periodEnd = new Date(sub.cancel_at * 1000);
        if (periodEnd > new Date()) {
          res.status(400).json({
            error: `Your subscription is set to cancel on ${periodEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. You can delete your account after that date.`,
            code: "SUBSCRIPTION_PENDING_CANCEL",
          });
          return;
        }
      }
    } catch {
      // Stale subscription ID — allow deletion to proceed
    }
  }

  // Cascade delete all user data in dependency order
  const projects = await db.select({ id: projectsTable.id }).from(projectsTable).where(eq(projectsTable.userId, req.userId!));
  const projectIds = projects.map(p => p.id);

  if (projectIds.length > 0) {
    // Media for user's projects
    const media = await db.select({ id: mediaAssetsTable.id }).from(mediaAssetsTable).where(inArray(mediaAssetsTable.projectId, projectIds));
    const mediaIds = media.map(m => m.id);

    if (mediaIds.length > 0) {
      await db.delete(aiJobsTable).where(inArray(aiJobsTable.mediaId, mediaIds));
      await db.delete(commentsTable).where(inArray(commentsTable.mediaId, mediaIds));
      await db.delete(favoritesTable).where(inArray(favoritesTable.mediaId, mediaIds));
      await db.delete(mediaAssetsTable).where(inArray(mediaAssetsTable.id, mediaIds));
    }

    // Galleries for user's projects
    const galleries = await db.select({ id: galleriesTable.id }).from(galleriesTable).where(inArray(galleriesTable.projectId, projectIds));
    const galleryIds = galleries.map(g => g.id);

    if (galleryIds.length > 0) {
      await db.delete(galleryMediaTable).where(inArray(galleryMediaTable.galleryId, galleryIds));
      await db.delete(galleriesTable).where(inArray(galleriesTable.id, galleryIds));
    }

    await db.delete(projectsTable).where(inArray(projectsTable.id, projectIds));
  }

  // Clients
  await db.delete(clientsTable).where(eq(clientsTable.userId, req.userId!));

  // User record
  await db.delete(usersTable).where(eq(usersTable.id, req.userId!));

  res.json({ success: true });
});

export default router;

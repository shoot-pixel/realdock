import { Router, type IRouter } from "express";
import { eq, count, sum } from "drizzle-orm";
import { db, usersTable, projectsTable, aiJobsTable, mediaAssetsTable } from "@workspace/db";
import { UpdateCurrentUserBody } from "@workspace/api-zod";
import { requireAuth, AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

const PLAN_FEATURES: Record<string, string[]> = {
  free: ["5GB Storage", "10 Projects", "Basic AI Tools", "Public Galleries"],
  pro: ["50GB Storage", "Unlimited Projects", "All AI Tools", "Private Galleries", "Custom Branding", "Priority Support"],
  studio: ["500GB Storage", "Unlimited Projects", "All AI Tools", "White-Label Galleries", "API Access", "Dedicated Support", "Team Members"],
};

const PLAN_STORAGE: Record<string, number> = { free: 5120, pro: 51200, studio: 512000 };
const PLAN_AI_CREDITS: Record<string, number> = { free: 20, pro: 200, studio: 2000 };
const PLAN_PROJECTS: Record<string, number | null> = { free: 10, pro: null, studio: null };

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
    storageLimitMb: PLAN_STORAGE[plan] ?? 5120,
    aiCreditsUsed,
    aiCreditsLimit: PLAN_AI_CREDITS[plan] ?? 20,
    projectsUsed,
    projectsLimit: PLAN_PROJECTS[plan] ?? null,
    renewalDate: renewalDate.toISOString(),
    features: PLAN_FEATURES[plan] ?? [],
  });
});

export default router;

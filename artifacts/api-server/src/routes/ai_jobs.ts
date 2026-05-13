import { Router, type IRouter } from "express";
import { eq, and, gte, ne, sql } from "drizzle-orm";
import { db, aiJobsTable, mediaAssetsTable, projectsTable } from "@workspace/db";
import { CreateAiJobBody, CreateAiJobParams, GetAiJobParams, CancelAiJobParams, ListAiJobsParams } from "@workspace/api-zod";
import { requireAuth, AuthenticatedRequest } from "../lib/auth";
import { logger } from "../lib/logger";

const PLAN_MONTHLY_CREDITS: Record<string, number> = { free: 0, pro: 100, studio: 2000 };

const router: IRouter = Router();

const JOB_CREDITS: Record<string, number> = {
  virtual_staging: 5,
  furniture_replacement: 4,
  declutter: 3,
  sky_replacement: 2,
  day_to_dusk: 3,
  hdr_enhancement: 1,
  object_removal: 2,
  color_grading: 1,
};

function serializeJob(j: typeof aiJobsTable.$inferSelect) {
  return {
    id: j.id,
    mediaId: j.mediaId,
    jobType: j.jobType,
    status: j.status,
    progressPercent: j.progressPercent,
    resultUrl: j.resultUrl,
    settings: j.settings ?? {},
    errorMessage: j.errorMessage,
    creditsUsed: j.creditsUsed,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  };
}

function simulateJobProgress(jobId: number): void {
  const steps = [10, 25, 50, 75, 90, 100];
  let step = 0;

  const interval = setInterval(async () => {
    try {
      const progress = steps[step];
      const isComplete = step === steps.length - 1;

      await db.update(aiJobsTable).set({
        progressPercent: progress,
        status: isComplete ? "completed" : "processing",
        resultUrl: isComplete ? `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200` : undefined,
      }).where(eq(aiJobsTable.id, jobId));

      step++;
      if (isComplete) {
        clearInterval(interval);
        await db.update(mediaAssetsTable)
          .set({ status: "processed" })
          .where(eq(mediaAssetsTable.id, (await db.select().from(aiJobsTable).where(eq(aiJobsTable.id, jobId)))[0]?.mediaId ?? 0));
      }
    } catch (err) {
      logger.error({ err, jobId }, "Job simulation error");
      clearInterval(interval);
    }
  }, 3000 + Math.random() * 2000);
}

router.get("/media/:mediaId/ai-jobs", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = ListAiJobsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const jobs = await db.select().from(aiJobsTable)
    .where(eq(aiJobsTable.mediaId, params.data.mediaId))
    .orderBy(aiJobsTable.createdAt);
  res.json(jobs.map(serializeJob));
});

router.post("/media/:mediaId/ai-jobs", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = CreateAiJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateAiJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [media] = await db.select().from(mediaAssetsTable).where(eq(mediaAssetsTable.id, params.data.mediaId));
  if (!media) {
    res.status(404).json({ error: "Media not found" });
    return;
  }
  // ── Plan enforcement ────────────────────────────────────────────────────
  const plan = req.user!.plan;
  const monthlyLimit = PLAN_MONTHLY_CREDITS[plan] ?? 0;

  if (monthlyLimit === 0) {
    res.status(403).json({
      error: "AI features are not available on the Free plan. Upgrade to Pro or Studio.",
      upgrade: true,
    });
    return;
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [creditResult] = await db
    .select({ total: sql<number>`coalesce(sum(${aiJobsTable.creditsUsed}), 0)` })
    .from(aiJobsTable)
    .innerJoin(mediaAssetsTable, eq(aiJobsTable.mediaId, mediaAssetsTable.id))
    .innerJoin(projectsTable, eq(mediaAssetsTable.projectId, projectsTable.id))
    .where(and(
      eq(projectsTable.userId, req.userId!),
      gte(aiJobsTable.createdAt, startOfMonth),
      ne(aiJobsTable.status, "cancelled"),
    ));

  const creditsUsedThisMonth = Number(creditResult?.total ?? 0);
  const creditsForThisJob = JOB_CREDITS[parsed.data.jobType] ?? 1;

  if (creditsUsedThisMonth + creditsForThisJob > monthlyLimit) {
    res.status(402).json({
      error: `Monthly AI credit limit reached. Used ${creditsUsedThisMonth} of ${monthlyLimit} credits.`,
      creditsUsed: creditsUsedThisMonth,
      monthlyLimit,
      upgrade: true,
    });
    return;
  }

  const creditsUsed = creditsForThisJob;
  const [job] = await db.insert(aiJobsTable).values({
    mediaId: params.data.mediaId,
    jobType: parsed.data.jobType,
    status: "queued",
    progressPercent: 0,
    settings: parsed.data.settings ?? {},
    creditsUsed,
  }).returning();

  await db.update(mediaAssetsTable).set({ status: "processing" }).where(eq(mediaAssetsTable.id, params.data.mediaId));
  simulateJobProgress(job.id);

  res.status(201).json(serializeJob(job));
});

router.get("/ai-jobs/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetAiJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [job] = await db.select().from(aiJobsTable).where(eq(aiJobsTable.id, params.data.id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(serializeJob(job));
});

router.patch("/ai-jobs/:id/cancel", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = CancelAiJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [job] = await db.update(aiJobsTable)
    .set({ status: "cancelled" })
    .where(eq(aiJobsTable.id, params.data.id))
    .returning();
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(serializeJob(job));
});

export default router;

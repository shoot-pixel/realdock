import { Router, type IRouter } from "express";
import { eq, count, sum, and, gte } from "drizzle-orm";
import { db, projectsTable, mediaAssetsTable, aiJobsTable, galleriesTable, clientsTable, usersTable } from "@workspace/db";
import { requireAuth, AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;

  const projects = await db.select().from(projectsTable).where(eq(projectsTable.userId, userId));
  const projectIds = projects.map(p => p.id);
  const activeProjects = projects.filter(p => p.status === "active").length;

  let totalMediaAssets = 0;
  let storageUsedMb = 0;
  if (projectIds.length > 0) {
    const mediaStats = await db.select({
      cnt: count(),
      totalSize: sum(mediaAssetsTable.sizeMb),
    }).from(mediaAssetsTable).where(
      projectIds.length > 0
        ? eq(mediaAssetsTable.projectId, projectIds[0])
        : eq(mediaAssetsTable.projectId, -1)
    );
    if (mediaStats[0]) {
      totalMediaAssets = Number(mediaStats[0].cnt ?? 0);
      storageUsedMb = Number(mediaStats[0].totalSize ?? 0);
    }
    for (let i = 1; i < projectIds.length; i++) {
      const s = await db.select({ cnt: count(), totalSize: sum(mediaAssetsTable.sizeMb) })
        .from(mediaAssetsTable).where(eq(mediaAssetsTable.projectId, projectIds[i]));
      if (s[0]) {
        totalMediaAssets += Number(s[0].cnt ?? 0);
        storageUsedMb += Number(s[0].totalSize ?? 0);
      }
    }
  }

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  let aiJobsThisMonth = 0;
  if (projectIds.length > 0) {
    const allMedia = await db.select({ id: mediaAssetsTable.id }).from(mediaAssetsTable)
      .where(eq(mediaAssetsTable.projectId, projectIds[0]));
    for (const pid of projectIds.slice(1)) {
      const m = await db.select({ id: mediaAssetsTable.id }).from(mediaAssetsTable).where(eq(mediaAssetsTable.projectId, pid));
      allMedia.push(...m);
    }
    const mediaIds = allMedia.map(m => m.id);
    if (mediaIds.length > 0) {
      const jobStats = await db.select({ cnt: count() }).from(aiJobsTable)
        .where(and(
          eq(aiJobsTable.mediaId, mediaIds[0]),
          gte(aiJobsTable.createdAt, oneMonthAgo)
        ));
      for (let i = 1; i < mediaIds.length; i++) {
        const s = await db.select({ cnt: count() }).from(aiJobsTable)
          .where(and(eq(aiJobsTable.mediaId, mediaIds[i]), gte(aiJobsTable.createdAt, oneMonthAgo)));
        aiJobsThisMonth += Number(s[0]?.cnt ?? 0);
      }
      aiJobsThisMonth += Number(jobStats[0]?.cnt ?? 0);
    }
  }

  let activeGalleries = 0;
  if (projectIds.length > 0) {
    for (const pid of projectIds) {
      const g = await db.select({ cnt: count() }).from(galleriesTable)
        .where(and(eq(galleriesTable.projectId, pid), eq(galleriesTable.isPublic, true)));
      activeGalleries += Number(g[0]?.cnt ?? 0);
    }
  }

  const [clientStats] = await db.select({ cnt: count() }).from(clientsTable).where(eq(clientsTable.userId, userId));
  const totalClients = Number(clientStats?.cnt ?? 0);

  res.json({
    totalProjects: projects.length,
    activeProjects,
    totalMediaAssets,
    storageUsedMb,
    aiJobsThisMonth,
    activeGalleries,
    totalClients,
    pendingDownloads: 0,
  });
});

router.get("/dashboard/recent-activity", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const projects = await db.select().from(projectsTable).where(eq(projectsTable.userId, userId));

  const activities: Array<{
    id: number;
    type: string;
    description: string;
    projectId: number | null;
    projectName: string | null;
    mediaId: number | null;
    thumbnailUrl: string | null;
    createdAt: string;
  }> = [];

  for (const project of projects.slice(0, 5)) {
    const media = await db.select().from(mediaAssetsTable)
      .where(eq(mediaAssetsTable.projectId, project.id))
      .orderBy(mediaAssetsTable.createdAt);

    for (const m of media.slice(0, 3)) {
      activities.push({
        id: m.id,
        type: "upload",
        description: `Uploaded ${m.filename} to ${project.name}`,
        projectId: project.id,
        projectName: project.name,
        mediaId: m.id,
        thumbnailUrl: m.thumbnailUrl,
        createdAt: m.createdAt.toISOString(),
      });
    }
  }

  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(activities.slice(0, 20));
});

router.get("/dashboard/storage-usage", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const projects = await db.select().from(projectsTable).where(eq(projectsTable.userId, userId));

  let totalUsedMb = 0;
  const byProject: Array<{ projectId: number; projectName: string; usedMb: number }> = [];

  for (const project of projects) {
    const [stats] = await db.select({ totalSize: sum(mediaAssetsTable.sizeMb) })
      .from(mediaAssetsTable).where(eq(mediaAssetsTable.projectId, project.id));
    const usedMb = Number(stats?.totalSize ?? 0);
    totalUsedMb += usedMb;
    byProject.push({ projectId: project.id, projectName: project.name, usedMb });
  }

  const PLAN_LIMITS: Record<string, number> = { free: 5120, pro: 51200, studio: 512000 };
  const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const plan = userRow?.plan ?? "free";
  const limitMb = PLAN_LIMITS[plan] ?? 5120;

  res.json({ totalUsedMb, limitMb, byProject });
});

export default router;

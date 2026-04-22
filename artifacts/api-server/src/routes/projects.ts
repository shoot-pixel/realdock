import { Router, type IRouter } from "express";
import { eq, and, like, count, sql } from "drizzle-orm";
import { db, projectsTable, mediaAssetsTable, galleriesTable } from "@workspace/db";
import { CreateProjectBody, UpdateProjectBody, UpdateProjectParams, DeleteProjectParams, GetProjectParams, GetProjectStatsParams, ListProjectsQueryParams } from "@workspace/api-zod";
import { requireAuth, AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

function serializeProject(p: typeof projectsTable.$inferSelect, mediaCount: number) {
  return {
    id: p.id,
    userId: p.userId,
    clientId: p.clientId,
    name: p.name,
    address: p.address,
    propertyType: p.propertyType,
    status: p.status,
    coverImageUrl: p.coverImageUrl,
    mediaCount,
    shootDate: p.shootDate,
    deliveryDate: p.deliveryDate,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/projects", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const qp = ListProjectsQueryParams.safeParse(req.query);
  const userId = req.userId!;
  let query = db.select().from(projectsTable).where(eq(projectsTable.userId, userId));
  const projects = await query;

  let filtered = projects;
  if (qp.success && qp.data.status) {
    filtered = filtered.filter(p => p.status === qp.data.status);
  }
  if (qp.success && qp.data.search) {
    const s = qp.data.search.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(s) || p.address.toLowerCase().includes(s));
  }

  const mediaCountsRaw = await db.select({
    projectId: mediaAssetsTable.projectId,
    cnt: count(),
  }).from(mediaAssetsTable).groupBy(mediaAssetsTable.projectId);

  const mediaCountMap = new Map(mediaCountsRaw.map(r => [r.projectId, Number(r.cnt)]));

  const result = filtered.map(p => serializeProject(p, mediaCountMap.get(p.id) ?? 0));
  res.json(result);
});

router.post("/projects", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db.insert(projectsTable).values({
    userId: req.userId!,
    ...parsed.data,
  }).returning();
  res.status(201).json(serializeProject(project, 0));
});

router.get("/projects/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db.select().from(projectsTable)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, req.userId!)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [{ cnt }] = await db.select({ cnt: count() }).from(mediaAssetsTable).where(eq(mediaAssetsTable.projectId, project.id));
  res.json(serializeProject(project, Number(cnt)));
});

router.patch("/projects/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db.update(projectsTable)
    .set(parsed.data)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, req.userId!)))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [{ cnt }] = await db.select({ cnt: count() }).from(mediaAssetsTable).where(eq(mediaAssetsTable.projectId, project.id));
  res.json(serializeProject(project, Number(cnt)));
});

router.delete("/projects/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db.delete(projectsTable)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, req.userId!)))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/projects/:id/stats", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetProjectStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db.select().from(projectsTable)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, req.userId!)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const media = await db.select().from(mediaAssetsTable).where(eq(mediaAssetsTable.projectId, project.id));
  const photos = media.filter(m => m.mediaType === "photo").length;
  const videos = media.filter(m => m.mediaType === "video").length;
  const aiProcessed = media.filter(m => m.status === "processed").length;
  const approved = media.filter(m => m.isApproved).length;
  const pending = media.filter(m => !m.isApproved && m.status !== "rejected").length;
  const totalSizeMb = media.reduce((s, m) => s + (m.sizeMb ?? 0), 0);

  const galleries = await db.select().from(galleriesTable).where(eq(galleriesTable.projectId, project.id));
  const galleryViews = galleries.reduce((s, g) => s + g.viewCount, 0);
  const downloads = galleries.reduce((s, g) => s + g.downloadCount, 0);

  res.json({
    totalMedia: media.length,
    photos,
    videos,
    aiProcessed,
    approved,
    pending,
    totalSizeMb,
    galleryViews,
    downloads,
  });
});

export default router;

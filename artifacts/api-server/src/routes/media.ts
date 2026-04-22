import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, mediaAssetsTable, projectsTable } from "@workspace/db";
import { UploadMediaBody, UpdateMediaBody, UpdateMediaParams, DeleteMediaParams, GetMediaParams, ListMediaParams, ListMediaQueryParams, ApproveMediaParams } from "@workspace/api-zod";
import { requireAuth, AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

function serializeMedia(m: typeof mediaAssetsTable.$inferSelect) {
  return {
    id: m.id,
    projectId: m.projectId,
    filename: m.filename,
    originalUrl: m.originalUrl,
    thumbnailUrl: m.thumbnailUrl,
    processedUrl: m.processedUrl,
    mediaType: m.mediaType,
    mimeType: m.mimeType,
    sizeMb: m.sizeMb,
    width: m.width,
    height: m.height,
    durationSeconds: m.durationSeconds,
    status: m.status,
    isApproved: m.isApproved,
    isFavorited: false,
    sortOrder: m.sortOrder,
    tags: m.tags ?? [],
    metadata: {},
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

router.get("/projects/:projectId/media", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = ListMediaParams.safeParse(req.params);
  const qp = ListMediaQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db.select().from(projectsTable)
    .where(and(eq(projectsTable.id, params.data.projectId), eq(projectsTable.userId, req.userId!)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  let media = await db.select().from(mediaAssetsTable)
    .where(eq(mediaAssetsTable.projectId, params.data.projectId))
    .orderBy(mediaAssetsTable.sortOrder);

  if (qp.success && qp.data.type) {
    media = media.filter(m => m.mediaType === qp.data.type);
  }
  if (qp.success && qp.data.status) {
    media = media.filter(m => m.status === qp.data.status);
  }

  res.json(media.map(serializeMedia));
});

router.post("/projects/:projectId/media", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = ListMediaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db.select().from(projectsTable)
    .where(and(eq(projectsTable.id, params.data.projectId), eq(projectsTable.userId, req.userId!)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parsed = UploadMediaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [media] = await db.insert(mediaAssetsTable).values({
    projectId: params.data.projectId,
    ...parsed.data,
    tags: parsed.data.tags ?? [],
    status: "ready",
  }).returning();
  res.status(201).json(serializeMedia(media));
});

router.get("/media/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetMediaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [media] = await db.select().from(mediaAssetsTable).where(eq(mediaAssetsTable.id, params.data.id));
  if (!media) {
    res.status(404).json({ error: "Media not found" });
    return;
  }
  res.json(serializeMedia(media));
});

router.patch("/media/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = UpdateMediaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMediaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [media] = await db.update(mediaAssetsTable)
    .set(parsed.data)
    .where(eq(mediaAssetsTable.id, params.data.id))
    .returning();
  if (!media) {
    res.status(404).json({ error: "Media not found" });
    return;
  }
  res.json(serializeMedia(media));
});

router.delete("/media/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = DeleteMediaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [media] = await db.delete(mediaAssetsTable).where(eq(mediaAssetsTable.id, params.data.id)).returning();
  if (!media) {
    res.status(404).json({ error: "Media not found" });
    return;
  }
  res.sendStatus(204);
});

router.patch("/media/:id/approve", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = ApproveMediaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db.select().from(mediaAssetsTable).where(eq(mediaAssetsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Media not found" });
    return;
  }
  const [media] = await db.update(mediaAssetsTable)
    .set({ isApproved: !existing.isApproved, status: !existing.isApproved ? "approved" : "ready" })
    .where(eq(mediaAssetsTable.id, params.data.id))
    .returning();
  res.json(serializeMedia(media));
});

export default router;

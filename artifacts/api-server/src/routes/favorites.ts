import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, favoritesTable, mediaAssetsTable, projectsTable } from "@workspace/db";
import { ToggleFavoriteBody, ToggleFavoriteParams, ListFavoritesParams } from "@workspace/api-zod";
import { requireAuth, AuthenticatedRequest } from "../lib/auth";
import { inArray } from "drizzle-orm";

const router: IRouter = Router();

router.post("/media/:mediaId/favorite", async (req, res): Promise<void> => {
  const params = ToggleFavoriteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ToggleFavoriteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(favoritesTable)
    .where(eq(favoritesTable.mediaId, params.data.mediaId));

  if (existing.length > 0) {
    await db.delete(favoritesTable).where(eq(favoritesTable.mediaId, params.data.mediaId));
    res.json({ mediaId: params.data.mediaId, isFavorited: false });
  } else {
    await db.insert(favoritesTable).values({
      mediaId: params.data.mediaId,
      clientName: parsed.data.clientName ?? null,
      galleryToken: parsed.data.galleryToken ?? null,
    });
    res.json({ mediaId: params.data.mediaId, isFavorited: true });
  }
});

router.get("/projects/:projectId/favorites", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = ListFavoritesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const projectMedia = await db.select({ id: mediaAssetsTable.id })
    .from(mediaAssetsTable)
    .where(eq(mediaAssetsTable.projectId, params.data.projectId));

  const mediaIds = projectMedia.map(m => m.id);
  if (mediaIds.length === 0) {
    res.json([]);
    return;
  }

  const favs = await db.select().from(favoritesTable)
    .where(inArray(favoritesTable.mediaId, mediaIds));
  const favMediaIds = [...new Set(favs.map(f => f.mediaId))];

  if (favMediaIds.length === 0) {
    res.json([]);
    return;
  }

  const media = await db.select().from(mediaAssetsTable)
    .where(inArray(mediaAssetsTable.id, favMediaIds));

  res.json(media.map(m => ({
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
    isFavorited: true,
    sortOrder: m.sortOrder,
    tags: m.tags ?? [],
    metadata: {},
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  })));
});

export default router;

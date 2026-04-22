import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, galleriesTable, galleryMediaTable, mediaAssetsTable, projectsTable, usersTable } from "@workspace/db";
import { CreateGalleryBody, CreateGalleryParams, UpdateGalleryBody, UpdateGalleryParams, DeleteGalleryParams, GetGalleryParams, GetPublicGalleryParams, ListGalleriesParams } from "@workspace/api-zod";
import { requireAuth, AuthenticatedRequest } from "../lib/auth";
import { randomBytes } from "crypto";

const router: IRouter = Router();

function generateToken(): string {
  return randomBytes(16).toString("hex");
}

async function getGalleryWithMediaIds(gallery: typeof galleriesTable.$inferSelect) {
  const gm = await db.select().from(galleryMediaTable).where(eq(galleryMediaTable.galleryId, gallery.id));
  return {
    id: gallery.id,
    projectId: gallery.projectId,
    name: gallery.name,
    shareToken: gallery.shareToken,
    isPublic: gallery.isPublic,
    isPasswordProtected: gallery.isPasswordProtected,
    allowDownload: gallery.allowDownload,
    allowFavorites: gallery.allowFavorites,
    allowComments: gallery.allowComments,
    expiresAt: gallery.expiresAt,
    viewCount: gallery.viewCount,
    downloadCount: gallery.downloadCount,
    mediaIds: gm.map(m => m.mediaId),
    clientMessage: gallery.clientMessage,
    brandingLogoUrl: gallery.brandingLogoUrl,
    createdAt: gallery.createdAt.toISOString(),
  };
}

router.get("/projects/:projectId/galleries", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = ListGalleriesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const galleries = await db.select().from(galleriesTable)
    .where(eq(galleriesTable.projectId, params.data.projectId));
  const result = await Promise.all(galleries.map(getGalleryWithMediaIds));
  res.json(result);
});

router.post("/projects/:projectId/galleries", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = CreateGalleryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateGalleryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { mediaIds, password: _password, ...rest } = parsed.data;
  const [gallery] = await db.insert(galleriesTable).values({
    projectId: params.data.projectId,
    shareToken: generateToken(),
    isPublic: rest.isPublic ?? true,
    isPasswordProtected: rest.isPasswordProtected ?? false,
    allowDownload: rest.allowDownload ?? true,
    allowFavorites: rest.allowFavorites ?? true,
    allowComments: rest.allowComments ?? true,
    ...rest,
  }).returning();
  if (mediaIds && mediaIds.length > 0) {
    await db.insert(galleryMediaTable).values(
      mediaIds.map((mediaId, i) => ({ galleryId: gallery.id, mediaId, sortOrder: i }))
    );
  }
  const result = await getGalleryWithMediaIds(gallery);
  res.status(201).json(result);
});

router.get("/galleries/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetGalleryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [gallery] = await db.select().from(galleriesTable).where(eq(galleriesTable.id, params.data.id));
  if (!gallery) {
    res.status(404).json({ error: "Gallery not found" });
    return;
  }
  res.json(await getGalleryWithMediaIds(gallery));
});

router.patch("/galleries/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = UpdateGalleryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateGalleryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { mediaIds, password: _password, ...rest } = parsed.data;
  const [gallery] = await db.update(galleriesTable)
    .set(rest)
    .where(eq(galleriesTable.id, params.data.id))
    .returning();
  if (!gallery) {
    res.status(404).json({ error: "Gallery not found" });
    return;
  }
  if (mediaIds !== undefined) {
    await db.delete(galleryMediaTable).where(eq(galleryMediaTable.galleryId, gallery.id));
    if (mediaIds.length > 0) {
      await db.insert(galleryMediaTable).values(
        mediaIds.map((mediaId, i) => ({ galleryId: gallery.id, mediaId, sortOrder: i }))
      );
    }
  }
  res.json(await getGalleryWithMediaIds(gallery));
});

router.delete("/galleries/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = DeleteGalleryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(galleryMediaTable).where(eq(galleryMediaTable.galleryId, params.data.id));
  const [gallery] = await db.delete(galleriesTable).where(eq(galleriesTable.id, params.data.id)).returning();
  if (!gallery) {
    res.status(404).json({ error: "Gallery not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/gallery/:token", async (req, res): Promise<void> => {
  const params = GetPublicGalleryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [gallery] = await db.select().from(galleriesTable).where(eq(galleriesTable.shareToken, params.data.token));
  if (!gallery) {
    res.status(404).json({ error: "Gallery not found" });
    return;
  }

  await db.update(galleriesTable).set({ viewCount: gallery.viewCount + 1 }).where(eq(galleriesTable.id, gallery.id));

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, gallery.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [photographer] = await db.select().from(usersTable).where(eq(usersTable.id, project.userId));

  const galleryMedia = await db.select().from(galleryMediaTable).where(eq(galleryMediaTable.galleryId, gallery.id)).orderBy(galleryMediaTable.sortOrder);
  const mediaIds = galleryMedia.map(gm => gm.mediaId);
  const media = mediaIds.length > 0
    ? await db.select().from(mediaAssetsTable).where(inArray(mediaAssetsTable.id, mediaIds))
    : [];

  res.json({
    id: gallery.id,
    projectName: project.name,
    projectAddress: project.address,
    galleryName: gallery.name,
    allowDownload: gallery.allowDownload,
    allowFavorites: gallery.allowFavorites,
    allowComments: gallery.allowComments,
    clientMessage: gallery.clientMessage,
    brandingLogoUrl: gallery.brandingLogoUrl,
    photographerName: photographer?.name ?? "StudioFlow Photographer",
    media: media.map(m => ({
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
    })),
  });
});

export default router;

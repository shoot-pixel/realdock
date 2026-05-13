import { Router, type IRouter } from "express";
import { eq, and, inArray, asc, ne, desc } from "drizzle-orm";
import { db, galleriesTable, galleryMediaTable, mediaAssetsTable, projectsTable, usersTable, invoicesTable } from "@workspace/db";
import { CreateGalleryBody, CreateGalleryParams, UpdateGalleryBody, UpdateGalleryParams, DeleteGalleryParams, GetGalleryParams, GetPublicGalleryParams, ListGalleriesParams } from "@workspace/api-zod";
import { requireAuth, AuthenticatedRequest } from "../lib/auth";
import { randomBytes } from "crypto";
import { Readable } from "stream";
import { ZipArchive } from "archiver";
import OpenAI from "openai";

const router: IRouter = Router();

function generateToken(): string {
  return randomBytes(16).toString("hex");
}

function getOpenAIClient() {
  const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  if (!baseURL || !apiKey) return null;
  return new OpenAI({ baseURL, apiKey });
}

function galleryRow(gallery: typeof galleriesTable.$inferSelect) {
  return {
    id: gallery.id,
    projectId: gallery.projectId,
    name: gallery.name,
    shareToken: gallery.shareToken,
    visibility: gallery.visibility ?? "link_only",
    isPublic: gallery.isPublic,
    isPasswordProtected: gallery.isPasswordProtected,
    allowDownload: gallery.allowDownload,
    allowFavorites: gallery.allowFavorites,
    allowComments: gallery.allowComments,
    expiresAt: gallery.expiresAt,
    viewCount: gallery.viewCount,
    downloadCount: gallery.downloadCount,
    clientMessage: gallery.clientMessage,
    brandingLogoUrl: gallery.brandingLogoUrl,
    companyName: gallery.companyName ?? null,
    coverImageUrl: gallery.coverImageUrl ?? null,
    theme: gallery.theme ?? "classic",
    customCss: gallery.customCss ?? null,
    createdAt: gallery.createdAt.toISOString(),
  };
}

async function getGalleryWithMediaIds(gallery: typeof galleriesTable.$inferSelect) {
  const gm = await db.select().from(galleryMediaTable)
    .where(eq(galleryMediaTable.galleryId, gallery.id))
    .orderBy(asc(galleryMediaTable.sortOrder));
  return {
    ...galleryRow(gallery),
    mediaIds: gm.map(m => m.mediaId),
  };
}

router.get("/galleries", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const userProjects = await db.select({ id: projectsTable.id }).from(projectsTable)
    .where(eq(projectsTable.userId, userId));
  if (userProjects.length === 0) {
    res.json([]);
    return;
  }
  const projectIds = userProjects.map(p => p.id);
  const galleries = await db.select().from(galleriesTable)
    .where(inArray(galleriesTable.projectId, projectIds))
    .orderBy(desc(galleriesTable.createdAt))
    .limit(10);
  res.json(galleries.map(galleryRow));
});

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
    visibility: rest.visibility ?? "link_only",
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

async function fetchPublicGallery(token: string) {
  const [gallery] = await db.select().from(galleriesTable).where(eq(galleriesTable.shareToken, token));
  if (!gallery) return { error: "not_found" as const };

  const visibility = gallery.visibility ?? "link_only";
  if (visibility === "private") return { error: "private" as const };

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, gallery.projectId));
  if (!project) return { error: "not_found" as const };

  const [photographer] = await db.select().from(usersTable).where(eq(usersTable.id, project.userId));

  const galleryMedia = await db.select().from(galleryMediaTable)
    .where(eq(galleryMediaTable.galleryId, gallery.id))
    .orderBy(galleryMediaTable.sortOrder);

  let media;
  if (galleryMedia.length > 0) {
    // Explicit selection — keep sort order
    const mediaIds = galleryMedia.map(gm => gm.mediaId);
    const rows = await db.select().from(mediaAssetsTable).where(inArray(mediaAssetsTable.id, mediaIds));
    const byId = Object.fromEntries(rows.map(r => [r.id, r]));
    media = mediaIds.map(id => byId[id]).filter(Boolean) as typeof rows;
  } else {
    // No explicit selection — fall back to all project media ordered by upload date
    media = await db.select().from(mediaAssetsTable)
      .where(eq(mediaAssetsTable.projectId, gallery.projectId))
      .orderBy(mediaAssetsTable.sortOrder);
  }

  return {
    gallery,
    project,
    photographer,
    media,
  };
}

router.get("/gallery/:token", async (req, res): Promise<void> => {
  const params = GetPublicGalleryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await fetchPublicGallery(params.data.token);
  if ("error" in result) {
    if (result.error === "private") {
      res.status(403).json({ error: "This gallery is private." });
      return;
    }
    res.status(404).json({ error: "Gallery not found" });
    return;
  }

  const { gallery, project, photographer, media } = result;
  await db.update(galleriesTable).set({ viewCount: gallery.viewCount + 1 }).where(eq(galleriesTable.id, gallery.id));

  const [invoice] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.projectId, project.id), ne(invoicesTable.status, "void")));

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
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
    companyName: gallery.companyName ?? photographer?.businessName ?? null,
    coverImageUrl: gallery.coverImageUrl ?? null,
    theme: gallery.theme ?? "classic",
    customCss: gallery.customCss ?? null,
    invoiceToken: invoice?.shareToken ?? null,
    photographerName: photographer?.name ?? "RealDock Photographer",
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

router.post("/gallery/:token/listing-preview", async (req, res): Promise<void> => {
  const params = GetPublicGalleryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await fetchPublicGallery(params.data.token);
  if ("error" in result) {
    if (result.error === "private") {
      res.status(403).json({ error: "This gallery is private." });
      return;
    }
    res.status(404).json({ error: "Gallery not found" });
    return;
  }

  const { gallery, project, media } = result;
  const photoUrls = media.slice(0, 10).map(m => m.thumbnailUrl ?? m.originalUrl);
  const propertyName = project.name;
  const address = project.address ?? "Luxury Property";

  const openai = getOpenAIClient();

  let headline = `Stunning ${propertyName} — Luxury Living at Its Finest`;
  let description = `Welcome to ${propertyName} at ${address}. This exceptional property showcases impeccable craftsmanship and premium finishes throughout. Floor-to-ceiling windows flood the space with natural light, while the open-concept layout creates a seamless flow between living areas. The gourmet kitchen features top-of-the-line appliances and custom cabinetry. The primary suite offers a spa-inspired bath and walk-in closet. Entertain effortlessly on the private terrace with panoramic views. A rare opportunity to own one of the most coveted addresses in the area.`;
  let highlights = [
    "Professionally photographed — magazine-quality imagery",
    "Open-concept living with premium finishes throughout",
    "Chef's kitchen with top-of-the-line appliances",
    "Spa-inspired primary suite with walk-in closet",
    "Private outdoor entertaining areas",
    "Exceptional natural light throughout",
  ];
  let suggestedPrice = "$2,450,000";

  if (openai) {
    try {
      const prompt = `You are a luxury real estate copywriter. Generate a compelling property listing for:
Property Name: ${propertyName}
Address: ${address}
Number of Photos: ${media.length}

Return JSON with this exact structure:
{
  "headline": "short compelling headline (max 12 words)",
  "description": "3-4 sentence luxury real estate listing description highlighting the property's best features",
  "highlights": ["6 bullet point features in luxury real estate style"],
  "suggestedPrice": "a realistic price in the format $X,XXX,XXX based on a luxury property"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 600,
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.headline) headline = parsed.headline;
        if (parsed.description) description = parsed.description;
        if (Array.isArray(parsed.highlights)) highlights = parsed.highlights;
        if (parsed.suggestedPrice) suggestedPrice = parsed.suggestedPrice;
      }
    } catch (err) {
      // fall through to defaults
    }
  }

  res.json({
    propertyName,
    address,
    headline,
    description,
    highlights,
    suggestedPrice,
    bedrooms: null,
    bathrooms: null,
    squareFeet: null,
    photoUrls,
    platforms: [
      { name: "Zillow", tagline: "Find your way home" },
      { name: "Redfin", tagline: "Real estate, built for you" },
      { name: "Realtor.com", tagline: "Home of home search" },
      { name: "Compass", tagline: "Luxury real estate" },
    ],
    generatedAt: new Date().toISOString(),
  });
});

router.get("/gallery/:token/download-zip", async (req, res): Promise<void> => {
  const params = GetPublicGalleryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  const result = await fetchPublicGallery(params.data.token);
  if ("error" in result) {
    if (result.error === "private") {
      res.status(403).json({ error: "This gallery is private." });
      return;
    }
    res.status(404).json({ error: "Gallery not found" });
    return;
  }

  const { gallery, project, media } = result;

  if (!gallery.allowDownload) {
    res.status(403).json({ error: "Downloads are not allowed for this gallery." });
    return;
  }

  const safeProjectName = project.name
    .replace(/[^\w\s\-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 50) || "gallery";

  const zipFilename = `${safeProjectName}-photos.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);
  res.setHeader("Cache-Control", "no-store");

  const archive = new ZipArchive({ zlib: { level: 5 } });

  archive.on("error", (err) => {
    req.log.error({ err }, "ZIP archive error");
    if (!res.headersSent) res.status(500).end();
  });

  archive.pipe(res);

  for (let i = 0; i < media.length; i++) {
    const m = media[i]!;
    const url = m.originalUrl ?? m.processedUrl ?? m.thumbnailUrl;
    if (!url) continue;

    try {
      const resp = await fetch(url);
      if (!resp.ok || !resp.body) continue;

      const urlPath = url.split("?")[0] ?? "";
      const inferredExt = urlPath.split(".").pop()?.toLowerCase() ?? "jpg";
      const validExt = ["jpg", "jpeg", "png", "webp", "gif", "tiff"].includes(inferredExt)
        ? inferredExt
        : "jpg";

      const entryName = m.filename.includes(".")
        ? m.filename
        : `photo-${String(i + 1).padStart(3, "0")}.${validExt}`;

      archive.append(Readable.fromWeb(resp.body as Parameters<typeof Readable.fromWeb>[0]), { name: entryName });
    } catch {
      // skip images that fail to fetch
    }
  }

  await archive.finalize();

  try {
    await db
      .update(galleriesTable)
      .set({ downloadCount: gallery.downloadCount + 1 })
      .where(eq(galleriesTable.id, gallery.id));
  } catch {
    // non-fatal
  }
});

export default router;

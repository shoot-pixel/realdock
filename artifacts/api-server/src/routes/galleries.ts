import { Router, type IRouter } from "express";
import { eq, and, inArray, asc, ne, desc } from "drizzle-orm";
import { db, galleriesTable, galleryMediaTable, mediaAssetsTable, projectsTable, usersTable, invoicesTable } from "@workspace/db";
import { CreateGalleryBody, CreateGalleryParams, UpdateGalleryBody, UpdateGalleryParams, DeleteGalleryParams, GetGalleryParams, GetPublicGalleryParams, ListGalleriesParams } from "@workspace/api-zod";
import { requireAuth, AuthenticatedRequest } from "../lib/auth";
import { randomBytes } from "crypto";
import { ZipArchive } from "archiver";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import OpenAI from "openai";

const objectStorageService = new ObjectStorageService();

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
  let gallery: typeof galleriesTable.$inferSelect | undefined;
  if (Object.keys(rest).length > 0) {
    const [updated] = await db.update(galleriesTable)
      .set(rest)
      .where(eq(galleriesTable.id, params.data.id))
      .returning();
    gallery = updated;
  } else {
    const [found] = await db.select().from(galleriesTable).where(eq(galleriesTable.id, params.data.id));
    gallery = found;
  }
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
    .where(and(eq(invoicesTable.projectId, project.id), ne(invoicesTable.status, "void")))
    .orderBy(desc(invoicesTable.id))
    .limit(1);

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
  const photoUrls = media.filter(m => m.mediaType === "photo").slice(0, 10).map(m => m.originalUrl ?? m.thumbnailUrl).filter(Boolean) as string[];
  const allPhotoUrls = photoUrls.length > 0 ? photoUrls : media.slice(0, 10).map(m => m.thumbnailUrl ?? m.originalUrl).filter(Boolean) as string[];
  const propertyName = project.name;
  const address = project.address ?? "Luxury Property";
  const propertyType = project.propertyType ?? "residential";
  const existingListingPrice = project.listingPrice;

  const openai = getOpenAIClient();

  let headline = `${propertyName} — An Exceptional Residence`;
  let description = `Nestled at ${address}, this remarkable ${propertyType} property offers an unparalleled living experience. Thoughtfully designed spaces flow seamlessly from room to room, with premium finishes and meticulous attention to detail throughout. The gourmet kitchen anchors the main living area, while the primary suite provides a private retreat with spa-inspired amenities. Lush outdoor spaces complete this rare offering in one of the area's most sought-after locations.`;
  let highlights = [
    "Premium finishes and custom millwork throughout",
    "Chef's kitchen with high-end appliances and custom cabinetry",
    "Spa-inspired primary suite with walk-in closet",
    "Abundant natural light with expansive windows",
    "Private outdoor entertaining and landscaped grounds",
    "Prime location in a coveted neighborhood",
  ];
  let suggestedPrice = existingListingPrice
    ? (existingListingPrice.startsWith("$") ? existingListingPrice : `$${existingListingPrice}`)
    : "$2,450,000";

  if (openai) {
    try {
      const visionPhotos = allPhotoUrls.slice(0, 4);

      const systemPrompt = `You are an elite luxury real estate copywriter for a top agency. Your writing is sophisticated, evocative, and buyer-focused.

ABSOLUTE RULES — violations are unacceptable:
- NEVER mention photography, photos, cameras, imagery, videography, or any media services
- NEVER reference how the property was documented or marketed
- Write ONLY about the property itself: its spaces, finishes, location, and lifestyle
- Descriptions must make a buyer want to live there, not comment on how the listing was created
- Draw on the address/location to weave in neighborhood lifestyle and local context`;

      const userPrompt = `Generate a luxury real estate listing for this property.

Property Name: ${propertyName}
Address: ${address}
Property Type: ${propertyType}${existingListingPrice ? `\nListing Price: $${existingListingPrice}` : ""}

${visionPhotos.length > 0 ? "I'm sharing interior and exterior photos of the property. Study the architectural details, finishes, spaces, and outdoor areas visible in the images to write an accurate, specific listing." : ""}

Return ONLY valid JSON with this exact structure:
{
  "headline": "Compelling headline max 10 words — specific to this property, never generic, no photography references",
  "description": "3-4 sentences describing the property's spaces, finishes, and lifestyle based on the location. Evocative and buyer-focused. Never mention photography.",
  "highlights": ["6 specific, concrete property features observed from the space and location — no photography, no generic filler"],
  "suggestedPrice": "${existingListingPrice ? `$${existingListingPrice}` : "Realistic price in format $X,XXX,XXX based on property type and location"}"
}`;

      type MessageContent = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "low" } };
      const userContent: MessageContent[] = [{ type: "text", text: userPrompt }];
      for (const url of visionPhotos) {
        userContent.push({ type: "image_url", image_url: { url, detail: "low" } });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        max_tokens: 700,
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (typeof parsed.headline === "string" && parsed.headline.trim()) headline = parsed.headline;
        if (typeof parsed.description === "string" && parsed.description.trim()) description = parsed.description;
        if (Array.isArray(parsed.highlights) && parsed.highlights.length > 0) highlights = parsed.highlights;
        if (typeof parsed.suggestedPrice === "string" && parsed.suggestedPrice.trim()) suggestedPrice = parsed.suggestedPrice;
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
    photoUrls: allPhotoUrls,
    platforms: [
      { name: "Zillow", tagline: "Find your way home" },
      { name: "Redfin", tagline: "Real estate, built for you" },
      { name: "Realtor.com", tagline: "Home of home search" },
      { name: "Compass", tagline: "Luxury real estate" },
    ],
    generatedAt: new Date().toISOString(),
  });
});

router.post("/gallery/:token/social-post", async (req, res): Promise<void> => {
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

  const { gallery, project, photographer, media } = result;
  const address = project.address ?? "Luxury Property";
  const coverImageUrl =
    gallery.coverImageUrl ??
    media.find(m => m.mediaType === "photo")?.originalUrl ??
    media[0]?.originalUrl ??
    null;
  const companyName =
    (gallery.companyName as string | null | undefined) ??
    (photographer as { businessName?: string } | null)?.businessName ??
    "RealDock";

  let tagline = "A rare opportunity to own an exceptional residence in a coveted location.";

  const openai = getOpenAIClient();
  if (openai) {
    try {
      type MsgContent =
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string; detail: "low" } };

      const userContent: MsgContent[] = [
        {
          type: "text",
          text: `Write a single luxury real estate tagline for a "COMING SOON" social media post. Property address: ${address}. Requirements: evocative and aspirational, under 12 words, no quotes, absolutely no mention of photography cameras or media — only describe the lifestyle and opportunity.`,
        },
      ];
      if (coverImageUrl) {
        userContent.push({ type: "image_url", image_url: { url: coverImageUrl, detail: "low" } });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a luxury real estate copywriter. Write short, evocative taglines for 'COMING SOON' social media posts. Respond with ONLY the tagline — no explanation, no quotes, no hashtags.",
          },
          { role: "user", content: userContent },
        ],
        max_tokens: 60,
      });

      const raw = completion.choices[0]?.message?.content?.trim();
      if (raw) tagline = raw.replace(/^["']|["']$/g, "");
    } catch {
      // fall through to default
    }
  }

  const [invoice] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.projectId, project.id), ne(invoicesTable.status, "void")))
    .orderBy(desc(invoicesTable.id))
    .limit(1);

  const clientName = invoice?.clientName || null;

  res.setHeader("Cache-Control", "no-store");
  res.json({ tagline, address, projectName: project.name, coverImageUrl, clientName });
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
      let buffer: Buffer;

      if (url.startsWith("/objects/") || url.startsWith("/api/storage/objects/")) {
        // Object storage path — read directly from GCS
        // Normalise: /api/storage/objects/... → /objects/...
        const objectPath = url.startsWith("/api/storage/objects/")
          ? url.replace("/api/storage", "")
          : url;
        const file = await objectStorageService.getObjectEntityFile(objectPath);
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          const stream = file.createReadStream();
          stream.on("data", (chunk: Buffer) => chunks.push(chunk));
          stream.on("end", resolve);
          stream.on("error", reject);
        });
        buffer = Buffer.concat(chunks);
      } else if (url.startsWith("http://") || url.startsWith("https://")) {
        // External URL — fetch over HTTP
        const resp = await fetch(url);
        if (!resp.ok) continue;
        buffer = Buffer.from(await resp.arrayBuffer());
      } else {
        // Unknown URL format — skip
        req.log.warn({ url }, "Skipping media with unrecognised URL format");
        continue;
      }

      const urlPath = url.split("?")[0] ?? "";
      const inferredExt = urlPath.split(".").pop()?.toLowerCase() ?? "jpg";
      const validExt = ["jpg", "jpeg", "png", "webp", "gif", "tiff"].includes(inferredExt)
        ? inferredExt
        : "jpg";

      const entryName = m.filename.includes(".")
        ? m.filename
        : `photo-${String(i + 1).padStart(3, "0")}.${validExt}`;

      archive.append(buffer, { name: entryName });
    } catch (err) {
      req.log.warn({ err, mediaId: m.id }, "Skipping media asset — failed to read");
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

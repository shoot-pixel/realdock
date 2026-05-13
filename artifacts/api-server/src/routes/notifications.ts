import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, galleryEventsTable } from "@workspace/db";
import { requireAuth, AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const events = await db
    .select()
    .from(galleryEventsTable)
    .where(eq(galleryEventsTable.userId, userId))
    .orderBy(desc(galleryEventsTable.createdAt))
    .limit(50);

  res.json(
    events.map(e => ({
      id: e.id,
      galleryId: e.galleryId,
      galleryName: e.galleryName,
      projectName: e.projectName,
      ipAddress: e.ipAddress,
      eventType: e.eventType,
      isRead: e.isRead,
      createdAt: e.createdAt.toISOString(),
    })),
  );
});

router.post("/notifications/read-all", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  await db
    .update(galleryEventsTable)
    .set({ isRead: true })
    .where(and(eq(galleryEventsTable.userId, userId), eq(galleryEventsTable.isRead, false)));
  res.status(204).end();
});

export default router;

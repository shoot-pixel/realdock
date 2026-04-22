import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, commentsTable } from "@workspace/db";
import { CreateCommentBody, CreateCommentParams, DeleteCommentParams, ListCommentsParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/media/:mediaId/comments", async (req, res): Promise<void> => {
  const params = ListCommentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const comments = await db.select().from(commentsTable)
    .where(eq(commentsTable.mediaId, params.data.mediaId))
    .orderBy(commentsTable.createdAt);
  res.json(comments.map(c => ({
    id: c.id,
    mediaId: c.mediaId,
    authorName: c.authorName,
    authorEmail: c.authorEmail,
    body: c.body,
    isClientComment: c.isClientComment,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/media/:mediaId/comments", async (req, res): Promise<void> => {
  const params = CreateCommentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [comment] = await db.insert(commentsTable).values({
    mediaId: params.data.mediaId,
    ...parsed.data,
  }).returning();
  res.status(201).json({
    id: comment.id,
    mediaId: comment.mediaId,
    authorName: comment.authorName,
    authorEmail: comment.authorEmail,
    body: comment.body,
    isClientComment: comment.isClientComment,
    createdAt: comment.createdAt.toISOString(),
  });
});

router.delete("/comments/:id", async (req, res): Promise<void> => {
  const params = DeleteCommentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [comment] = await db.delete(commentsTable).where(eq(commentsTable.id, params.data.id)).returning();
  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;

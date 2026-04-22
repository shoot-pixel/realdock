import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, clientsTable, projectsTable } from "@workspace/db";
import { CreateClientBody, UpdateClientBody, UpdateClientParams, DeleteClientParams, GetClientParams } from "@workspace/api-zod";
import { requireAuth, AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

async function serializeClient(c: typeof clientsTable.$inferSelect, userId: number) {
  const [{ cnt }] = await db.select({ cnt: count() })
    .from(projectsTable)
    .where(and(eq(projectsTable.clientId, c.id), eq(projectsTable.userId, userId)));
  return {
    id: c.id,
    userId: c.userId,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    notes: c.notes,
    projectCount: Number(cnt),
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/clients", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const clients = await db.select().from(clientsTable).where(eq(clientsTable.userId, req.userId!));
  const result = await Promise.all(clients.map(c => serializeClient(c, req.userId!)));
  res.json(result);
});

router.post("/clients", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [client] = await db.insert(clientsTable).values({
    userId: req.userId!,
    ...parsed.data,
  }).returning();
  res.status(201).json(await serializeClient(client, req.userId!));
});

router.get("/clients/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [client] = await db.select().from(clientsTable)
    .where(and(eq(clientsTable.id, params.data.id), eq(clientsTable.userId, req.userId!)));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(await serializeClient(client, req.userId!));
});

router.patch("/clients/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [client] = await db.update(clientsTable)
    .set(parsed.data)
    .where(and(eq(clientsTable.id, params.data.id), eq(clientsTable.userId, req.userId!)))
    .returning();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(await serializeClient(client, req.userId!));
});

router.delete("/clients/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [client] = await db.delete(clientsTable)
    .where(and(eq(clientsTable.id, params.data.id), eq(clientsTable.userId, req.userId!)))
    .returning();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;

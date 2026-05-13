import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, invoicesTable, projectsTable } from "@workspace/db";
import { requireAuth, AuthenticatedRequest } from "../lib/auth";
import { randomBytes } from "crypto";
import { CreateInvoiceBody, CreateInvoiceParams, GetPublicInvoiceParams } from "@workspace/api-zod";

const router: IRouter = Router();

function generateToken(): string {
  return randomBytes(16).toString("hex");
}

function serializeInvoice(
  inv: typeof invoicesTable.$inferSelect,
  projectName: string,
  projectAddress: string,
) {
  return {
    id: inv.id,
    projectId: inv.projectId,
    userId: inv.userId,
    shareToken: inv.shareToken,
    status: inv.status,
    clientName: inv.clientName,
    clientEmail: inv.clientEmail ?? null,
    lineItems: (inv.lineItems as Array<{ description: string; amount: number }>) ?? [],
    notes: inv.notes ?? null,
    totalAmount: inv.totalAmount,
    dueDate: inv.dueDate ?? null,
    projectName,
    projectAddress,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  };
}

router.post("/projects/:id/invoice", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = CreateInvoiceParams.safeParse(req.params);
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

  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { clientName, clientEmail, lineItems, notes, dueDate } = parsed.data;
  const totalAmount = lineItems.reduce((sum: number, item: { description: string; amount: number }) => sum + item.amount, 0);

  const [invoice] = await db.insert(invoicesTable).values({
    projectId: project.id,
    userId: req.userId!,
    shareToken: generateToken(),
    clientName,
    clientEmail: clientEmail ?? null,
    lineItems,
    notes: notes ?? null,
    totalAmount,
    dueDate: dueDate ?? null,
    status: "draft",
  }).returning();

  res.status(201).json(serializeInvoice(invoice, project.name, project.address));
});

router.get("/invoices/:token", async (req, res): Promise<void> => {
  const params = GetPublicInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [invoice] = await db.select().from(invoicesTable)
    .where(eq(invoicesTable.shareToken, params.data.token));
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, invoice.projectId));

  res.setHeader("Cache-Control", "no-store");
  res.json(serializeInvoice(invoice, project?.name ?? "", project?.address ?? ""));
});

export default router;

import { pgTable, text, serial, timestamp, integer, real, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "void"]);

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
  shareToken: text("share_token").notNull().unique(),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  clientName: text("client_name").notNull().default(""),
  clientEmail: text("client_email"),
  lineItems: jsonb("line_items").notNull().default([]),
  notes: text("notes"),
  totalAmount: real("total_amount").notNull().default(0),
  dueDate: text("due_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;

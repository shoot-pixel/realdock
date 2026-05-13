import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propertyTypeEnum = pgEnum("property_type", ["residential", "commercial", "luxury", "vacation", "land"]);
export const projectStatusEnum = pgEnum("project_status", ["draft", "active", "delivered", "archived", "completed", "paid"]);

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  clientId: integer("client_id"),
  name: text("name").notNull(),
  address: text("address").notNull(),
  propertyType: propertyTypeEnum("property_type").notNull().default("residential"),
  status: projectStatusEnum("status").notNull().default("draft"),
  coverImageUrl: text("cover_image_url"),
  listingPrice: text("listing_price"),
  shootFee: text("shoot_fee"),
  shootDate: text("shoot_date"),
  deliveryDate: text("delivery_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;

import { pgTable, text, serial, timestamp, integer, real, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mediaTypeEnum = pgEnum("media_type", ["photo", "video", "virtual_tour"]);
export const mediaStatusEnum = pgEnum("media_status", ["uploading", "ready", "processing", "processed", "approved", "rejected"]);

export const mediaAssetsTable = pgTable("media_assets", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  filename: text("filename").notNull(),
  originalUrl: text("original_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  processedUrl: text("processed_url"),
  mediaType: mediaTypeEnum("media_type").notNull().default("photo"),
  mimeType: text("mime_type").notNull(),
  sizeMb: real("size_mb").notNull().default(0),
  width: integer("width"),
  height: integer("height"),
  durationSeconds: real("duration_seconds"),
  status: mediaStatusEnum("status").notNull().default("ready"),
  isApproved: boolean("is_approved").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMediaSchema = createInsertSchema(mediaAssetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMedia = z.infer<typeof insertMediaSchema>;
export type MediaAsset = typeof mediaAssetsTable.$inferSelect;

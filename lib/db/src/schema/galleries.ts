import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const galleriesTable = pgTable("galleries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  shareToken: text("share_token").notNull().unique(),
  visibility: text("visibility").notNull().default("link_only"),
  isPublic: boolean("is_public").notNull().default(true),
  isPasswordProtected: boolean("is_password_protected").notNull().default(false),
  password: text("password"),
  allowDownload: boolean("allow_download").notNull().default(true),
  allowFavorites: boolean("allow_favorites").notNull().default(true),
  allowComments: boolean("allow_comments").notNull().default(true),
  expiresAt: text("expires_at"),
  viewCount: integer("view_count").notNull().default(0),
  downloadCount: integer("download_count").notNull().default(0),
  clientMessage: text("client_message"),
  brandingLogoUrl: text("branding_logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const galleryMediaTable = pgTable("gallery_media", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull(),
  mediaId: integer("media_id").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertGallerySchema = createInsertSchema(galleriesTable).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true, downloadCount: true });
export type InsertGallery = z.infer<typeof insertGallerySchema>;
export type Gallery = typeof galleriesTable.$inferSelect;

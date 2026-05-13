import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const galleryEventsTable = pgTable("gallery_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  galleryId: integer("gallery_id").notNull(),
  projectId: integer("project_id").notNull(),
  galleryName: text("gallery_name").notNull(),
  projectName: text("project_name").notNull(),
  ipAddress: text("ip_address").notNull(),
  eventType: text("event_type").notNull(), // 'view' | 'download'
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GalleryEvent = typeof galleryEventsTable.$inferSelect;

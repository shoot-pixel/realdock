import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const favoritesTable = pgTable("favorites", {
  id: serial("id").primaryKey(),
  mediaId: integer("media_id").notNull(),
  clientName: text("client_name"),
  galleryToken: text("gallery_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Favorite = typeof favoritesTable.$inferSelect;

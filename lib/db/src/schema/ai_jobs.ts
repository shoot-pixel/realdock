import { pgTable, text, serial, timestamp, integer, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiJobTypeEnum = pgEnum("ai_job_type", [
  "virtual_staging",
  "furniture_replacement",
  "declutter",
  "sky_replacement",
  "day_to_dusk",
  "hdr_enhancement",
  "object_removal",
  "color_grading",
]);
export const aiJobStatusEnum = pgEnum("ai_job_status", ["queued", "processing", "completed", "failed", "cancelled"]);

export const aiJobsTable = pgTable("ai_jobs", {
  id: serial("id").primaryKey(),
  mediaId: integer("media_id").notNull(),
  jobType: aiJobTypeEnum("job_type").notNull(),
  status: aiJobStatusEnum("status").notNull().default("queued"),
  progressPercent: integer("progress_percent").notNull().default(0),
  resultUrl: text("result_url"),
  settings: jsonb("settings"),
  errorMessage: text("error_message"),
  creditsUsed: integer("credits_used").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAiJobSchema = createInsertSchema(aiJobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiJob = z.infer<typeof insertAiJobSchema>;
export type AiJob = typeof aiJobsTable.$inferSelect;

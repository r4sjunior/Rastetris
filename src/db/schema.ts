import { pgTable, text, uuid, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Key-Value Store Table
 *
 * Built-in table for simple key-value storage.
 * Available immediately without schema changes.
 *
 * ⚠️ CRITICAL: DO NOT DELETE OR EDIT THIS TABLE DEFINITION ⚠️
 * This table is required for the app to function properly.
 * DO NOT delete, modify, rename, or change any part of this table.
 * Removing or editing it will cause database schema conflicts and prevent
 * the app from starting.
 *
 * Use for:
 * - User preferences/settings
 * - App configuration
 * - Simple counters
 * - Temporary data
 */
export const kv = pgTable("kv", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/**
 * Add your custom tables below this line
 */

/** Scores do RASTETRIS (um registro por game over). */
export const rastetrisScores = pgTable("rastetris_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  fid: integer("fid").notNull(),
  score: integer("score").notNull(),
  level: integer("level").notNull(),
  lines: integer("lines").notNull().default(0),
  invaders: integer("invaders").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

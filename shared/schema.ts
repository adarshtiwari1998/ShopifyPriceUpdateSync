import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const stores = pgTable("stores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  shopifyUrl: text("shopify_url").notNull(),
  accessToken: text("access_token").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const googleSheets = pgTable("google_sheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  sheetId: text("sheet_id").notNull(),
  sheetName: text("sheet_name").default("Sheet1"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const syncSessions = pgTable("sync_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  sheetId: varchar("sheet_id").notNull().references(() => googleSheets.id),
  status: text("status").notNull(), // 'running', 'completed', 'failed', 'stopped'
  totalSkus: integer("total_skus").default(0),
  processedSkus: integer("processed_skus").default(0),
  updatedSkus: integer("updated_skus").default(0),
  notFoundSkus: integer("not_found_skus").default(0),
  errorCount: integer("error_count").default(0),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const syncLogs = pgTable("sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => syncSessions.id),
  sku: text("sku").notNull(),
  status: text("status").notNull(), // 'success', 'not_found', 'error'
  oldPrice: decimal("old_price", { precision: 10, scale: 2 }),
  newPrice: decimal("new_price", { precision: 10, scale: 2 }),
  oldComparePrice: decimal("old_compare_price", { precision: 10, scale: 2 }),
  newComparePrice: decimal("new_compare_price", { precision: 10, scale: 2 }),
  errorMessage: text("error_message"),
  shopifyVariantId: text("shopify_variant_id"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const storeRelations = relations(stores, ({ many }) => ({
  googleSheets: many(googleSheets),
  syncSessions: many(syncSessions),
}));

export const googleSheetsRelations = relations(googleSheets, ({ one, many }) => ({
  store: one(stores, {
    fields: [googleSheets.storeId],
    references: [stores.id],
  }),
  syncSessions: many(syncSessions),
}));

export const syncSessionRelations = relations(syncSessions, ({ one, many }) => ({
  store: one(stores, {
    fields: [syncSessions.storeId],
    references: [stores.id],
  }),
  sheet: one(googleSheets, {
    fields: [syncSessions.sheetId],
    references: [googleSheets.id],
  }),
  logs: many(syncLogs),
}));

export const syncLogRelations = relations(syncLogs, ({ one }) => ({
  session: one(syncSessions, {
    fields: [syncLogs.sessionId],
    references: [syncSessions.id],
  }),
}));

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
});

export const insertGoogleSheetSchema = createInsertSchema(googleSheets).omit({
  id: true,
  createdAt: true,
});

export const insertSyncSessionSchema = createInsertSchema(syncSessions).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export const insertSyncLogSchema = createInsertSchema(syncLogs).omit({
  id: true,
  timestamp: true,
});

export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type GoogleSheet = typeof googleSheets.$inferSelect;
export type InsertGoogleSheet = z.infer<typeof insertGoogleSheetSchema>;
export type SyncSession = typeof syncSessions.$inferSelect;
export type InsertSyncSession = z.infer<typeof insertSyncSessionSchema>;
export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;

// Keep existing user schema for compatibility
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

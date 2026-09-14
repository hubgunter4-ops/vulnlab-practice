import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing auth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Normalized public practice environments collected by the Scrapling job. */
export const practiceEnvironments = mysqlTable(
  "practice_environments",
  {
    id: varchar("id", { length: 160 }).primaryKey(),
    sourceId: varchar("sourceId", { length: 64 }).notNull(),
    sourceName: varchar("sourceName", { length: 128 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    url: varchar("url", { length: 768 }).notNull(),
    category: varchar("category", { length: 128 }).notNull(),
    difficulty: varchar("difficulty", { length: 32 }).notNull(),
    description: text("description").notNull(),
    discoveryMethod: varchar("discoveryMethod", { length: 32 }).notNull(),
    skillsJson: text("skillsJson").notNull(),
    points: int("points").notNull().default(150),
    firstSeenAt: timestamp("firstSeenAt").defaultNow().notNull(),
    lastSyncedAt: timestamp("lastSyncedAt").defaultNow().notNull(),
  },
  table => ({
    sourceIndex: index("practice_environments_source_idx").on(table.sourceId),
    syncIndex: index("practice_environments_sync_idx").on(table.lastSyncedAt),
  }),
);

/** One row records every successful or failed catalog refresh. */
export const catalogSyncRuns = mysqlTable(
  "catalog_sync_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
    status: mysqlEnum("status", ["running", "success", "partial", "failed"]).notNull(),
    sourceCount: int("sourceCount").notNull().default(0),
    environmentCount: int("environmentCount").notNull().default(0),
    errorMessage: text("errorMessage"),
  },
  table => ({
    statusIndex: index("catalog_sync_runs_status_idx").on(table.status),
    startedIndex: index("catalog_sync_runs_started_idx").on(table.startedAt),
  }),
);

/** Durable owner row for the platform-managed project-level Heartbeat job. */
export const catalogSyncSettings = mysqlTable("catalog_sync_settings", {
  id: int("id").primaryKey(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  cronExpression: varchar("cronExpression", { length: 64 }).notNull().default("0 0 6 * * *"),
  enabled: int("enabled").notNull().default(1),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PracticeEnvironment = typeof practiceEnvironments.$inferSelect;
export type CatalogSyncRun = typeof catalogSyncRuns.$inferSelect;
export type CatalogSyncSettings = typeof catalogSyncSettings.$inferSelect;

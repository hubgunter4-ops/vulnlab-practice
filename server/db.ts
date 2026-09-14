import { eq } from "drizzle-orm";
import { desc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { catalogSyncRuns, catalogSyncSettings, practiceEnvironments, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function listPracticeEnvironments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(practiceEnvironments).orderBy(desc(practiceEnvironments.lastSyncedAt));
}

export async function getLatestCatalogSync() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(catalogSyncRuns).orderBy(desc(catalogSyncRuns.startedAt)).limit(1);
  return result[0];
}

export async function getCatalogSyncSettings() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(catalogSyncSettings).where(eq(catalogSyncSettings.id, 1)).limit(1);
  return result[0];
}

export async function ensureCatalogSyncSettings() {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(catalogSyncSettings).values({ id: 1 }).onDuplicateKeyUpdate({ set: { id: 1 } });
  return getCatalogSyncSettings();
}

export async function createCatalogSyncRun(sourceCount: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(catalogSyncRuns).values({ status: "running", sourceCount, environmentCount: 0 });
  return Number(result[0].insertId);
}

export async function completeCatalogSyncRun(
  runId: number,
  status: "success" | "partial" | "failed",
  environmentCount: number,
  errorMessage?: string,
) {
  const db = await getDb();
  if (!db) return;
  await db.update(catalogSyncRuns).set({
    status,
    environmentCount,
    completedAt: new Date(),
    errorMessage: errorMessage ?? null,
  }).where(eq(catalogSyncRuns.id, runId));
}

export type NormalizedEnvironment = {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  category: string;
  difficulty: string;
  description: string;
  discoveryMethod: string;
  skills: string[];
  points: number;
};

export async function replacePracticeEnvironments(environments: NormalizedEnvironment[]) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const sourceIds = Array.from(new Set(environments.map(environment => environment.sourceId)));
  if (sourceIds.length === 0) throw new Error("Scrapling returned no sources");

  await db.transaction(async tx => {
    await tx.delete(practiceEnvironments).where(inArray(practiceEnvironments.sourceId, sourceIds));
    await tx.insert(practiceEnvironments).values(environments.map(environment => ({
      id: environment.id,
      sourceId: environment.sourceId,
      sourceName: environment.sourceName,
      title: environment.title,
      url: environment.url,
      category: environment.category,
      difficulty: environment.difficulty,
      description: environment.description,
      discoveryMethod: environment.discoveryMethod,
      skillsJson: JSON.stringify(environment.skills),
      points: environment.points,
      lastSyncedAt: new Date(),
    })));
  });
}

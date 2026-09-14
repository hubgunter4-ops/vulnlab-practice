import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as db from "./db";

const execFileAsync = promisify(execFile);
const SYNC_TIMEOUT_MS = 100_000;

export type ScraplingSyncResult = {
  syncedAt: string;
  sourceCount: number;
  environmentCount: number;
  fallbackSourceCount: number;
};

type ScraplingPayload = {
  syncedAt: string;
  sources: Array<{ id: string; usedFallback: boolean }>;
  environments: db.NormalizedEnvironment[];
};

function assertPayload(value: unknown): asserts value is ScraplingPayload {
  if (!value || typeof value !== "object") throw new Error("Scrapling output is not an object");
  const payload = value as Partial<ScraplingPayload>;
  if (typeof payload.syncedAt !== "string") throw new Error("Scrapling output is missing syncedAt");
  if (!Array.isArray(payload.sources) || !Array.isArray(payload.environments)) {
    throw new Error("Scrapling output is missing sources or environments");
  }
  for (const environment of payload.environments) {
    if (!environment.id || !environment.sourceId || !environment.title || !environment.url) {
      throw new Error("Scrapling returned an invalid environment record");
    }
  }
}

export async function runScraplingSync(): Promise<ScraplingSyncResult> {
  const runId = await db.createCatalogSyncRun(3);
  try {
    const { stdout, stderr } = await execFileAsync(
      "python3",
      ["scripts/scrapling_sync.py"],
      {
        cwd: process.cwd(),
        timeout: SYNC_TIMEOUT_MS,
        maxBuffer: 5 * 1024 * 1024,
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      },
    );
    if (stderr.trim()) console.info("[Scrapling]", stderr.trim());
    const payload: unknown = JSON.parse(stdout);
    assertPayload(payload);
    await db.replacePracticeEnvironments(payload.environments);

    const result: ScraplingSyncResult = {
      syncedAt: payload.syncedAt,
      sourceCount: payload.sources.length,
      environmentCount: payload.environments.length,
      fallbackSourceCount: payload.sources.filter(source => source.usedFallback).length,
    };
    if (runId !== undefined) {
      await db.completeCatalogSyncRun(
        runId,
        result.fallbackSourceCount > 0 ? "partial" : "success",
        result.environmentCount,
        result.fallbackSourceCount > 0 ? "Una o más fuentes usaron el catálogo público curado de respaldo." : undefined,
      );
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (runId !== undefined) await db.completeCatalogSyncRun(runId, "failed", 0, message);
    throw new Error(`Scrapling sync failed: ${message}`);
  }
}

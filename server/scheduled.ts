import type { Request, Response } from "express";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import { runScraplingSync } from "./scraplingSync";

export async function syncCatalogScheduledHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const settings = await db.getCatalogSyncSettings();
    if (!settings || settings.scheduleCronTaskUid !== user.taskUid || settings.enabled !== 1) {
      return res.json({ ok: true, skipped: "orphan-or-disabled" });
    }

    const result = await runScraplingSync();
    return res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (typeof error === "object" && error !== null && "statusCode" in error && (error as { statusCode?: number }).statusCode === 403) {
      return res.status(403).json({ error: message });
    }
    console.error("[Scheduled catalog sync]", error);
    return res.status(500).json({
      error: message,
      context: { url: req.originalUrl, taskUid: "redacted" },
      timestamp: new Date().toISOString(),
    });
  }
}

import { describe, expect, it } from "vitest";
import type { Request, Response } from "express";
import { appRouter } from "./routers";
import { syncCatalogScheduledHandler } from "./scheduled";

describe("catalog synchronization", () => {
  it("exposes a public catalog query even when the database is unavailable", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as never,
      res: {} as never,
    });

    const result = await caller.catalog.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects scheduled callbacks without a cron session", async () => {
    let statusCode = 200;
    let body: unknown;
    const response = {
      status(code: number) {
        statusCode = code;
        return response;
      },
      json(value: unknown) {
        body = value;
        return response;
      },
    } as unknown as Response;

    await syncCatalogScheduledHandler(
      { headers: {}, originalUrl: "/api/scheduled/sync-catalog" } as Request,
      response,
    );

    expect(statusCode).toBe(403);
    expect(body).toEqual({ error: "Invalid session cookie" });
  });
});

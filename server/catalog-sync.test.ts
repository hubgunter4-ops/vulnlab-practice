import { describe, expect, it } from "vitest";
import type { Request, Response } from "express";
import { appRouter } from "./routers";
import { syncCatalogScheduledHandler } from "./scheduled";
import blueprintData from "../client/src/data/practice_blueprints.json";
import { executeLabCommand } from "./labRuntime";

describe("catalog synchronization", () => {
  it("keeps nine isolated reproducible labs across three platforms", () => {
    const labs = blueprintData.platforms.flatMap(platform => platform.labs);
    expect(blueprintData.platforms).toHaveLength(3);
    expect(labs).toHaveLength(9);
    expect(new Set(labs.map(lab => lab.id)).size).toBe(9);
    expect(labs.every(lab => lab.terminal.initial_host.endsWith(".lab"))).toBe(true);
  });

  it("executes allowlisted evidence commands in a lab workspace", async () => {
    const result = await executeLabCommand("ps-sql-injection", "cat README.md");
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("SQL Injection");
  });

  it("blocks path traversal and network scanners", async () => {
    const network = await executeLabCommand("ps-sql-injection", "nmap -sV academy-sqli.lab");
    await expect(executeLabCommand("ps-sql-injection", "cat ../../etc/passwd")).rejects.toThrow("Ruta fuera del workspace");
    expect(network.exitCode).toBe(126);
    expect(network.output).toContain("no tiene red");
  });

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

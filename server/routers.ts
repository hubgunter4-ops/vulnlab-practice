import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { runScraplingSync } from "./scraplingSync";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  catalog: router({
    list: publicProcedure.query(async () => {
      const environments = await db.listPracticeEnvironments();
      return environments.map(environment => ({
        ...environment,
        skills: JSON.parse(environment.skillsJson) as string[],
      }));
    }),
    status: publicProcedure.query(async () => {
      const latest = await db.getLatestCatalogSync();
      const settings = await db.getCatalogSyncSettings();
      return {
        latest,
        schedule: settings ? {
          enabled: settings.enabled === 1,
          cronExpression: settings.cronExpression,
          configured: Boolean(settings.scheduleCronTaskUid),
        } : null,
      };
    }),
    syncNow: adminProcedure.mutation(async () => runScraplingSync()),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;

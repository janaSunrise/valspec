import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { projectsRouter } from "./projects";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  projects: projectsRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;

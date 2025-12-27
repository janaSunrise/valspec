import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { environmentsRouter } from "./environments";
import { projectsRouter } from "./projects";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  projects: projectsRouter,
  environments: environmentsRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;

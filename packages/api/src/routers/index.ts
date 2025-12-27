import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { apiKeysRouter } from "./api-keys";
import { environmentsRouter } from "./environments";
import { projectsRouter } from "./projects";
import { secretsRouter } from "./secrets";
import { versionsRouter } from "./versions";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  projects: projectsRouter,
  environments: environmentsRouter,
  secrets: secretsRouter,
  versions: versionsRouter,
  apiKeys: apiKeysRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;

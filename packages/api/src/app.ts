import { Elysia } from "elysia";

import { loggerPlugin } from "./plugins/logger";
import {
  projectRoutes,
  environmentRoutes,
  secretRoutes,
  versionRoutes,
  apiKeyRoutes,
  auditRoutes,
  secretsApiRoutes,
} from "./routes";

export const app = new Elysia()
  .use(loggerPlugin)
  // Internal routes (session-based auth, `/internal*`)
  .group("/internal", (app) =>
    app
      .use(projectRoutes)
      .use(environmentRoutes)
      .use(secretRoutes)
      .use(versionRoutes)
      .use(apiKeyRoutes)
      .use(auditRoutes),
  )
  // API routes (API key auth)
  .use(secretsApiRoutes);

export type App = typeof app;

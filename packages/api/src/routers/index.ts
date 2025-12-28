import type { RouterClient } from "@orpc/server";

import { internalRouter } from "./internal";
import { apiRouter } from "./api";

export { internalRouter, apiRouter };

export type InternalRouter = typeof internalRouter;
export type InternalRouterClient = RouterClient<typeof internalRouter>;

export type ApiRouter = typeof apiRouter;
export type ApiRouterClient = RouterClient<typeof apiRouter>;

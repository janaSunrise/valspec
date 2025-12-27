import { ORPCError, os } from "@orpc/server";
import { z } from "zod";

import type { Context } from "./context";
import {
  requireProjectAccess,
  requireEnvAccess,
  requireSecretAccess,
} from "./middleware/ownership";

export const o = os.$context<Context>();

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const publicProcedure = o;
export const protectedProcedure = publicProcedure.use(requireAuth);

/**
 * Procedure that requires project ownership.
 * Adds `project` to context after verification.
 */
export const projectProcedure = protectedProcedure
  .input(z.object({ projectId: z.cuid() }))
  .use(async ({ context, next }, input) => {
    const project = await requireProjectAccess(
      input.projectId,
      context.session.user.id,
    );
    return next({
      context: { ...context, project },
    });
  });

/**
 * Procedure that requires environment ownership.
 * Adds `project` and `environment` to context after verification.
 */
export const environmentProcedure = protectedProcedure
  .input(z.object({ projectId: z.cuid(), envId: z.cuid() }))
  .use(async ({ context, next }, input) => {
    const { project, environment } = await requireEnvAccess(
      input.projectId,
      input.envId,
      context.session.user.id,
    );
    return next({
      context: { ...context, project, environment },
    });
  });

/**
 * Procedure that requires secret ownership.
 * Adds `project`, `environment`, and `secret` to context after verification.
 */
export const secretProcedure = protectedProcedure
  .input(
    z.object({
      projectId: z.cuid(),
      envId: z.cuid(),
      secretId: z.cuid(),
    }),
  )
  .use(async ({ context, next }, input) => {
    const { project, environment, secret } = await requireSecretAccess(
      input.projectId,
      input.envId,
      input.secretId,
      context.session.user.id,
    );
    return next({
      context: { ...context, project, environment, secret },
    });
  });

import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";

export const base = os.$context<Context>();

// Session-based authentication (for internal/web app)
const requireAuth = base.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

// API key authentication (for external API)
const requireApiKey = base.middleware(async ({ context, next }) => {
  if (!context.apiKey) {
    throw new ORPCError("UNAUTHORIZED", { message: "Invalid or missing API key" });
  }
  return next({
    context: {
      apiKey: context.apiKey,
    },
  });
});

export const publicProcedure = base;
export const protectedProcedure = publicProcedure.use(requireAuth);
export const apiKeyProcedure = publicProcedure.use(requireApiKey);

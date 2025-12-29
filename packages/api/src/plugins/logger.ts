import { Elysia } from "elysia";
import pino from "pino";

import { env } from "@valspec/env/server";

export const logger = pino({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
        }
      : undefined,
});

export const loggerPlugin = new Elysia({ name: "logger" })
  .onRequest(({ request }) => {
    logger.debug({ method: request.method, path: new URL(request.url).pathname }, "request");
  })
  .onAfterResponse(({ request, set }) => {
    logger.info(
      { method: request.method, path: new URL(request.url).pathname, status: set.status },
      "response",
    );
  })
  .onError(({ error, request }) => {
    logger.error(
      { method: request.method, path: new URL(request.url).pathname, error: String(error) },
      "error",
    );
  });

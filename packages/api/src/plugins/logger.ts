import { Elysia } from "elysia";
import pino from "pino";

import { env } from "@valspec/env/server";

const isDev = env.NODE_ENV === "development";

export const logger = pino({
  level: isDev ? "info" : "info",
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss",
          ignore: "pid,hostname,method,path,status,duration,err",
          messageFormat: "{method} {path} {status} {duration}ms",
          customColors: "info:cyan,warn:yellow,error:red",
          singleLine: true,
        },
      }
    : undefined,
});

const requestTimes = new WeakMap<Request, number>();

export const loggerPlugin = new Elysia({ name: "logger" })
  .derive({ as: "global" }, ({ request }) => {
    requestTimes.set(request, performance.now());
    return {};
  })
  .onAfterHandle({ as: "global" }, ({ request, set }) => {
    const start = requestTimes.get(request);
    const duration = start ? Math.round(performance.now() - start) : 0;
    const path = new URL(request.url).pathname;
    const status = typeof set.status === "number" ? set.status : 200;

    const data = { method: request.method, path, status, duration };

    if (status >= 500) logger.error(data);
    else if (status >= 400) logger.warn(data);
    else logger.info(data);
  })
  .onError({ as: "global" }, ({ error, request, set }) => {
    const start = requestTimes.get(request);
    const duration = start ? Math.round(performance.now() - start) : 0;
    const path = new URL(request.url).pathname;
    const status = typeof set.status === "number" ? set.status : 500;

    const data = { method: request.method, path, status, duration, err: String(error) };

    if (status >= 500) logger.error(data);
    else logger.warn(data);
  });

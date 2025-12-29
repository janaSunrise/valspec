import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import * as z from "zod";

import { app as api } from "@valspec/api";
import { auth } from "@valspec/auth";
import { env } from "@valspec/env/server";

const server = new Elysia({ aot: true })
  // Load plugins
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
      credentials: true,
    }),
  )
  .use(
    openapi({
      mapJsonSchema: {
        zod: z.toJSONSchema,
      },
    }),
  )
  // Load better auth routes
  .all("/api/auth/*", async ({ request, status }) => {
    if (["POST", "GET"].includes(request.method)) {
      return auth.handler(request);
    }
    return status(405);
  })
  // Load API routes
  .use(api)
  .get("/", () => "OK");

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});

export type App = typeof server;

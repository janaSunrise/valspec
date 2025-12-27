import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { RPCHandler } from "@orpc/server/fetch";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { onError } from "@orpc/server";

import { createContext } from "@valspec/api/context";
import { getSecrets, setSecrets } from "@valspec/api/lib/secrets-api";
import { appRouter } from "@valspec/api/routers/index";
import { auth } from "@valspec/auth";
import { env } from "@valspec/env/server";

// RPC handler for session-based API (frontend)
const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

// OpenAPI reference for REST documentation
const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
      credentials: true,
    }),
  )
  .all("/api/auth/*", async ({ request, status }) => {
    if (["POST", "GET"].includes(request.method)) {
      return auth.handler(request);
    }
    return status(405);
  })
  // Session-based API (frontend)
  .all("/rpc*", async (context) => {
    const { response } = await rpcHandler.handle(context.request, {
      prefix: "/rpc",
      context: await createContext({ context }),
    });
    return response ?? new Response("Not Found", { status: 404 });
  })
  // REST API for secrets (API key authenticated)
  .get("/secrets", async (context) => {
    const { apiKey } = await createContext({ context });
    if (!apiKey) {
      context.set.status = 401;
      return { error: "Missing or invalid API key" };
    }

    const result = await getSecrets(apiKey);
    if ("error" in result) {
      context.set.status = result.status;
      return { error: result.error };
    }

    return result.data;
  })
  .post(
    "/secrets",
    async (context) => {
      const { apiKey } = await createContext({ context });
      if (!apiKey) {
        context.set.status = 401;
        return { error: "Missing or invalid API key" };
      }

      const result = await setSecrets(apiKey, context.body);
      if ("error" in result) {
        context.set.status = result.status;
        return { error: result.error };
      }

      return result.data;
    },
    { body: t.Record(t.String(), t.String()) },
  )
  // OpenAPI reference
  .all("/api*", async (context) => {
    const { response } = await apiHandler.handle(context.request, {
      prefix: "/api-reference",
      context: await createContext({ context }),
    });
    return response ?? new Response("Not Found", { status: 404 });
  })
  .get("/", () => "OK");

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});

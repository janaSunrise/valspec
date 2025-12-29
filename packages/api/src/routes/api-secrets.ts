import { Elysia, t } from "elysia";

import { apiKeyAuth } from "../plugins/api-key-auth";
import { getSecrets, setSecrets } from "../lib/secrets-api";

export const secretsApiRoutes = new Elysia({ prefix: "/secrets" })
  .use(apiKeyAuth)

  .get("/", async ({ apiKey }) => {
    return getSecrets(apiKey);
  })

  .post(
    "/",
    async ({ apiKey, body }) => {
      return setSecrets(apiKey, body);
    },
    { body: t.Record(t.String(), t.String()) },
  );

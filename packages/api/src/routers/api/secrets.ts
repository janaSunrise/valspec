import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { apiKeyProcedure } from "../../procedures";
import { getSecrets, setSecrets } from "../../lib/secrets-api";

export const secretsRouter = {
  get: apiKeyProcedure.handler(async ({ context }) => {
    const result = await getSecrets(context.apiKey);

    if ("error" in result) {
      throw new ORPCError("BAD_REQUEST", { message: result.error });
    }

    return result.data;
  }),

  set: apiKeyProcedure
    .input(z.record(z.string(), z.string()))
    .handler(async ({ context, input }) => {
      const result = await setSecrets(context.apiKey, input);

      if ("error" in result) {
        if (result.status === 403) {
          throw new ORPCError("FORBIDDEN", { message: result.error });
        }
        throw new ORPCError("BAD_REQUEST", { message: result.error });
      }

      return result.data;
    }),
};

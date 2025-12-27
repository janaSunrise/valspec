import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    VALSPEC_MASTER_KEY: z.string().min(1).refine(
      (key) => {
        try {
          const bytes = Uint8Array.from(atob(key), (c) => c.charCodeAt(0));
          return bytes.length === 32;
        } catch {
          return false;
        }
      },
      { message: "VALSPEC_MASTER_KEY must be a 32-byte base64 encoded string." },
    ),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

import { z } from "zod";
import { secretKeySchema } from "./common";

export const createSecretSchema = z.object({
  key: secretKeySchema,
  value: z.string().min(1, "Value is required"),
});

export const updateSecretSchema = z.object({
  value: z.string().min(1, "Value is required"),
});

export type CreateSecretInput = z.infer<typeof createSecretSchema>;
export type UpdateSecretInput = z.infer<typeof updateSecretSchema>;

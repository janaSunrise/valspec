import { z } from "zod";

export const secretKeySchema = z
  .string()
  .min(1, "Key is required")
  .max(100, "Key must be at most 100 characters")
  .regex(
    /^[A-Z][A-Z0-9_]*$/,
    "Key must start with an uppercase letter and contain only uppercase letters, numbers, and underscores",
  );

export const createSecretSchema = z.object({
  key: secretKeySchema,
  value: z.string().min(1, "Value is required"),
});

export const updateSecretSchema = z.object({
  value: z.string().min(1, "Value is required"),
});

export type CreateSecretInput = z.infer<typeof createSecretSchema>;
export type UpdateSecretInput = z.infer<typeof updateSecretSchema>;

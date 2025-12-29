import { z } from "zod";
import { colorSchema, cuidSchema } from "./common";

export const createEnvironmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  color: colorSchema.optional(),
  inheritsFromId: cuidSchema.nullable().optional(),
});

export const updateEnvironmentSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: colorSchema.optional(),
  inheritsFromId: cuidSchema.nullable().optional(),
});

export type CreateEnvironmentInput = z.infer<typeof createEnvironmentSchema>;
export type UpdateEnvironmentInput = z.infer<typeof updateEnvironmentSchema>;

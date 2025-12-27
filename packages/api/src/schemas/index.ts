import { z } from "zod";

export const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format. Must be a hex color like #ffffff");

export const secretKeySchema = z
  .string()
  .min(1, "Key is required")
  .max(100, "Key must be at most 100 characters")
  .regex(
    /^[A-Z][A-Z0-9_]*$/,
    "Key must start with an uppercase letter and contain only uppercase letters, numbers, and underscores",
  );

export const cuidSchema = z.cuid();

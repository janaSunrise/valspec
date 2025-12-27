import { z } from "zod";

export const apiKeyPermissions = z.enum(["read", "write", "admin"]);

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  projectId: z.cuid(),
  environmentId: z.cuid().optional(),
  permissions: z.array(apiKeyPermissions).default(["read"]),
  expiresIn: z.number().min(1).max(365).optional(), // days
});

export const listApiKeysSchema = z.object({
  projectId: z.cuid().optional(),
});

export const apiKeyIdSchema = z.object({
  keyId: z.string().min(1),
});

export const apiKeyMetadataSchema = z.object({
  projectId: z.cuid(),
  environmentId: z.cuid().optional(),
  permissions: z.array(apiKeyPermissions).default(["read"]),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type ApiKeyPermission = z.infer<typeof apiKeyPermissions>;
export type ApiKeyMetadata = z.infer<typeof apiKeyMetadataSchema>;

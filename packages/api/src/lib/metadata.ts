import { apiKeyMetadataSchema, type ApiKeyMetadata } from "../schemas/api-key";

/**
 * Parses API key metadata from a JSON string.
 * Returns null if the string is null/undefined or if parsing fails.
 * Does not validate the schema - use parseApiKeyMetadataWithValidation for strict validation.
 */
export function parseApiKeyMetadata(
  metadataString: string | null | undefined,
): ApiKeyMetadata | null {
  if (!metadataString) return null;
  try {
    return JSON.parse(metadataString) as ApiKeyMetadata;
  } catch {
    return null;
  }
}

/**
 * Parses and validates API key metadata using Zod schema.
 * Handles both string and object inputs.
 * Returns null if validation fails.
 */
export function parseApiKeyMetadataWithValidation(
  metadata: string | Record<string, unknown> | null | undefined,
): ApiKeyMetadata | null {
  if (!metadata) return null;

  try {
    const raw = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
    const parsed = apiKeyMetadataSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

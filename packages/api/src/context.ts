import type { Context as ElysiaContext } from "elysia";

import { auth } from "@valspec/auth";

import { parseApiKeyMetadataWithValidation } from "./lib/metadata";
import type { ApiKeyMetadata, ApiKeyPermission } from "./schemas/api-key";

export type CreateContextOptions = {
  context: ElysiaContext;
};

export type ApiKeyData = {
  userId: string;
  metadata: ApiKeyMetadata;
  permissions: ApiKeyPermission[];
};

async function verifyApiKeyFromHeader(apiKeyHeader: string | null): Promise<ApiKeyData | null> {
  if (!apiKeyHeader) return null;

  try {
    const result = await auth.api.verifyApiKey({
      body: { key: apiKeyHeader },
    });

    if (!result.valid || !result.key) return null;

    const key = result.key;
    if (!key.enabled) return null;

    const metadata = parseApiKeyMetadataWithValidation(key.metadata);
    if (!metadata) return null;

    return {
      userId: key.userId,
      metadata,
      permissions: metadata.permissions,
    };
  } catch {
    return null;
  }
}

export async function createContext({ context }: CreateContextOptions) {
  const headers = context.request.headers;

  const [session, apiKey] = await Promise.all([
    auth.api.getSession({ headers }),
    verifyApiKeyFromHeader(headers.get("x-api-key")),
  ]);

  return {
    session,
    apiKey,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

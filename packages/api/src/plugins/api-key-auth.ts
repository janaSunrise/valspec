import { Elysia } from "elysia";

import { auth } from "@valspec/auth";
import prisma from "@valspec/db";

export type ApiKeyMetadata = {
  projectId: string;
  environmentId?: string;
  permissions: string[];
};

export type ApiKeyContext = {
  userId: string;
  keyId: string;
  metadata: ApiKeyMetadata;
};

function parseMetadata(raw: unknown): ApiKeyMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.projectId !== "string") return null;
  return {
    projectId: obj.projectId,
    environmentId: typeof obj.environmentId === "string" ? obj.environmentId : undefined,
    permissions: Array.isArray(obj.permissions)
      ? obj.permissions.filter((p) => typeof p === "string")
      : [],
  };
}

export const apiKeyAuth = new Elysia({ name: "api-key-auth" }).derive(
  { as: "scoped" },
  async ({ request, status }) => {
    const header = request.headers.get("x-api-key");
    if (!header) {
      throw status(401, { code: "UNAUTHORIZED", message: "API key required" });
    }

    const result = await auth.api.verifyApiKey({ body: { key: header } });
    if (!result.valid || !result.key) {
      throw status(401, { code: "UNAUTHORIZED", message: "Invalid API key" });
    }

    if (!result.key.enabled) {
      throw status(403, { code: "FORBIDDEN", message: "API key is disabled" });
    }

    const metadata = parseMetadata(result.key.metadata);
    if (!metadata) {
      throw status(403, { code: "FORBIDDEN", message: "Invalid API key configuration" });
    }

    // Update last used timestamp
    await prisma.apikey.update({
      where: { id: result.key.id },
      data: { lastRequest: new Date() },
    });

    return {
      apiKey: {
        userId: result.key.userId,
        keyId: result.key.id,
        metadata,
      } as ApiKeyContext,
    };
  },
);

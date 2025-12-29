import { Elysia, t } from "elysia";

import prisma from "@valspec/db";

import { getSecret } from "../lib/ownership";
import { sessionAuth } from "../plugins/session-auth";

export const versionRoutes = new Elysia({
  prefix: "/projects/:projectId/environments/:envId/secrets/:secretId/versions",
})
  .use(sessionAuth)

  .get(
    "/",
    async ({ session, params, status }) => {
      const secret = await getSecret(
        params.projectId,
        params.envId,
        params.secretId,
        session.user.id,
      );
      if (!secret) throw status(404, { code: "NOT_FOUND", message: "Secret not found" });

      return prisma.secretVersion.findMany({
        where: { secretId: params.secretId },
        orderBy: { version: "desc" },
        select: { id: true, version: true, changeType: true, changeSource: true, createdAt: true },
      });
    },
    { params: t.Object({ projectId: t.String(), envId: t.String(), secretId: t.String() }) },
  )

  .post(
    "/:versionId/rollback",
    async ({ session, params, status }) => {
      const secret = await getSecret(
        params.projectId,
        params.envId,
        params.secretId,
        session.user.id,
      );
      if (!secret) throw status(404, { code: "NOT_FOUND", message: "Secret not found" });

      const targetVersion = await prisma.secretVersion.findFirst({
        where: { id: params.versionId, secretId: params.secretId },
      });
      if (!targetVersion) throw status(404, { code: "NOT_FOUND", message: "Version not found" });

      if (targetVersion.changeType === "DELETED") {
        throw status(400, { code: "BAD_REQUEST", message: "Cannot rollback to a deleted version" });
      }

      const newVersion = secret.version + 1;

      const updated = await prisma.$transaction(async (tx) => {
        const s = await tx.secret.update({
          where: { id: params.secretId },
          data: {
            encryptedValue: targetVersion.encryptedValue,
            iv: targetVersion.iv,
            authTag: targetVersion.authTag,
            version: newVersion,
          },
        });
        await tx.secretVersion.create({
          data: {
            secretId: params.secretId,
            version: newVersion,
            encryptedValue: targetVersion.encryptedValue,
            iv: targetVersion.iv,
            authTag: targetVersion.authTag,
            changeType: "ROLLBACK",
            changeSource: "WEB",
          },
        });
        return s;
      });

      return {
        id: updated.id,
        key: updated.key,
        version: updated.version,
        environmentId: updated.environmentId,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        rolledBackToVersion: targetVersion.version,
      };
    },
    {
      params: t.Object({
        projectId: t.String(),
        envId: t.String(),
        secretId: t.String(),
        versionId: t.String(),
      }),
    },
  );

import { ORPCError } from "@orpc/server";
import { z } from "zod";

import prisma from "@valspec/db";

import { protectedProcedure } from "../index";
import { requireSecretAccess } from "../lib/ownership";

const secretIdSchema = z.object({ projectId: z.cuid(), envId: z.cuid(), secretId: z.cuid() });

export const versionsRouter = {
  list: protectedProcedure
    .input(secretIdSchema)
    .use(async ({ context, next }, input) => {
      await requireSecretAccess(
        input.projectId,
        input.envId,
        input.secretId,
        context.session.user.id,
      );
      return next({ context });
    })
    .handler(async ({ input }) => {
      const versions = await prisma.secretVersion.findMany({
        where: { secretId: input.secretId },
        orderBy: { version: "desc" },
        select: {
          id: true,
          version: true,
          changeType: true,
          changeSource: true,
          createdAt: true,
        },
      });

      return versions;
    }),

  rollback: protectedProcedure
    .input(z.object({ ...secretIdSchema.shape, versionId: z.cuid() }))
    .use(async ({ context, next }, input) => {
      await requireSecretAccess(
        input.projectId,
        input.envId,
        input.secretId,
        context.session.user.id,
      );
      return next({ context });
    })
    .handler(async ({ input }) => {
      const targetVersion = await prisma.secretVersion.findFirst({
        where: {
          id: input.versionId,
          secretId: input.secretId,
        },
      });

      if (!targetVersion) {
        throw new ORPCError("NOT_FOUND", { message: "Version not found" });
      }

      // Cannot rollback to a DELETED version
      if (targetVersion.changeType === "DELETED") {
        throw new ORPCError("BAD_REQUEST", { message: "Cannot rollback to a deleted version" });
      }

      // Get the current secret to determine new version number
      const currentSecret = await prisma.secret.findUniqueOrThrow({
        where: { id: input.secretId },
      });

      const newVersion = currentSecret.version + 1;

      const secret = await prisma.$transaction(async (tx) => {
        const updatedSecret = await tx.secret.update({
          where: { id: input.secretId },
          data: {
            encryptedValue: targetVersion.encryptedValue,
            iv: targetVersion.iv,
            authTag: targetVersion.authTag,
            version: newVersion,
          },
        });

        await tx.secretVersion.create({
          data: {
            secretId: input.secretId,
            version: newVersion,
            encryptedValue: targetVersion.encryptedValue,
            iv: targetVersion.iv,
            authTag: targetVersion.authTag,
            changeType: "ROLLBACK",
            changeSource: "WEB",
          },
        });

        return updatedSecret;
      });

      return {
        id: secret.id,
        key: secret.key,
        version: secret.version,
        environmentId: secret.environmentId,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
        rolledBackToVersion: targetVersion.version,
      };
    }),
};

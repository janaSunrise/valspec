import { ORPCError } from "@orpc/server";
import { z } from "zod";

import prisma from "@valspec/db";

import { protectedProcedure } from "../../procedures";
import { DEFAULT_ENVIRONMENT_COLOR } from "../../constants";
import { createAuditLog } from "../../lib/audit";
import { detectCircularInheritance } from "../../lib/inheritance";
import { requireProjectAccess, requireEnvAccess } from "../../lib/ownership";
import { slugify } from "../../lib/utils";
import { createEnvironmentSchema, updateEnvironmentSchema } from "../../schemas/environment";
import { projectIdSchema, envIdSchema } from "../../schemas";

export const environmentsRouter = {
  list: protectedProcedure
    .input(projectIdSchema)
    .use(async ({ context, next }, input) => {
      await requireProjectAccess(input.projectId, context.session.user.id);
      return next({ context });
    })
    .handler(async ({ input }) => {
      const environments = await prisma.environment.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "asc" },
      });

      return environments;
    }),

  get: protectedProcedure
    .input(envIdSchema)
    .use(async ({ context, next }, input) => {
      await requireEnvAccess(input.projectId, input.envId, context.session.user.id);
      return next({ context });
    })
    .handler(async ({ input }) => {
      const environment = await prisma.environment.findUniqueOrThrow({
        where: { id: input.envId },
      });

      return environment;
    }),

  create: protectedProcedure
    .input(z.object({ ...projectIdSchema.shape, ...createEnvironmentSchema.shape }))
    .use(async ({ context, next }, input) => {
      await requireProjectAccess(input.projectId, context.session.user.id);
      return next({ context });
    })
    .handler(async ({ context, input }) => {
      const slug = slugify(input.name);
      if (!slug) {
        throw new ORPCError("BAD_REQUEST", { message: "Invalid environment name" });
      }

      // Check for duplicate slug within project
      const existing = await prisma.environment.findFirst({
        where: { projectId: input.projectId, slug },
      });

      if (existing) {
        throw new ORPCError("CONFLICT", {
          message: "Environment with this name already exists",
        });
      }

      // Validate inheritance target exists in same project
      if (input.inheritsFromId) {
        const parent = await prisma.environment.findFirst({
          where: { id: input.inheritsFromId, projectId: input.projectId },
        });

        if (!parent) {
          throw new ORPCError("BAD_REQUEST", { message: "Invalid inheritance target" });
        }
      }

      const environment = await prisma.environment.create({
        data: {
          name: input.name,
          slug,
          color: input.color ?? DEFAULT_ENVIRONMENT_COLOR,
          projectId: input.projectId,
          inheritsFromId: input.inheritsFromId ?? null,
        },
      });

      await createAuditLog({
        action: "ENVIRONMENT_CREATED",
        projectId: input.projectId,
        environmentId: environment.id,
        actorType: "USER",
        actorUserId: context.session.user.id,
        metadata: { name: environment.name },
      });

      return environment;
    }),

  update: protectedProcedure
    .input(z.object({ ...envIdSchema.shape, ...updateEnvironmentSchema.shape }))
    .use(async ({ context, next }, input) => {
      await requireEnvAccess(input.projectId, input.envId, context.session.user.id);
      return next({ context });
    })
    .handler(async ({ context, input }) => {
      const updates: {
        name?: string;
        slug?: string;
        color?: string;
        inheritsFromId?: string | null;
      } = {};

      if (input.name !== undefined) {
        const newSlug = slugify(input.name);
        if (!newSlug) {
          throw new ORPCError("BAD_REQUEST", { message: "Invalid environment name" });
        }

        // Check for duplicate slug
        const existing = await prisma.environment.findFirst({
          where: {
            projectId: input.projectId,
            slug: newSlug,
            NOT: { id: input.envId },
          },
        });

        if (existing) {
          throw new ORPCError("CONFLICT", {
            message: "Environment with this name already exists",
          });
        }

        updates.name = input.name;
        updates.slug = newSlug;
      }

      if (input.color !== undefined) {
        updates.color = input.color;
      }

      if (input.inheritsFromId !== undefined) {
        if (input.inheritsFromId === null) {
          updates.inheritsFromId = null;
        } else {
          // Self-inheritance check
          if (input.inheritsFromId === input.envId) {
            throw new ORPCError("BAD_REQUEST", {
              message: "Environment cannot inherit from itself",
            });
          }

          // Validate parent exists in same project
          const parent = await prisma.environment.findFirst({
            where: { id: input.inheritsFromId, projectId: input.projectId },
          });

          if (!parent) {
            throw new ORPCError("BAD_REQUEST", { message: "Invalid inheritance target" });
          }

          // Circular inheritance check
          const allEnvs = await prisma.environment.findMany({
            where: { projectId: input.projectId },
            select: { id: true, inheritsFromId: true },
          });

          if (detectCircularInheritance(input.envId, input.inheritsFromId, allEnvs)) {
            throw new ORPCError("BAD_REQUEST", { message: "Circular inheritance detected" });
          }

          updates.inheritsFromId = input.inheritsFromId;
        }
      }

      if (Object.keys(updates).length === 0) {
        throw new ORPCError("BAD_REQUEST", { message: "No valid fields to update" });
      }

      const environment = await prisma.environment.update({
        where: { id: input.envId },
        data: updates,
      });

      await createAuditLog({
        action: "ENVIRONMENT_UPDATED",
        projectId: input.projectId,
        environmentId: environment.id,
        actorType: "USER",
        actorUserId: context.session.user.id,
        metadata: { updates },
      });

      return environment;
    }),

  delete: protectedProcedure
    .input(envIdSchema)
    .use(async ({ context, next }, input) => {
      await requireEnvAccess(input.projectId, input.envId, context.session.user.id);
      return next({ context });
    })
    .handler(async ({ context, input }) => {
      // Check if other environments inherit from this one
      const dependents = await prisma.environment.findMany({
        where: { inheritsFromId: input.envId },
        select: { name: true },
      });

      if (dependents.length > 0) {
        throw new ORPCError("BAD_REQUEST", {
          message: `Cannot delete: ${dependents.map((e) => e.name).join(", ")} inherit from this environment`,
        });
      }

      const environment = await prisma.environment.findUnique({
        where: { id: input.envId },
        select: { name: true },
      });

      await prisma.environment.delete({
        where: { id: input.envId },
      });

      await createAuditLog({
        action: "ENVIRONMENT_DELETED",
        projectId: input.projectId,
        environmentId: input.envId,
        actorType: "USER",
        actorUserId: context.session.user.id,
        metadata: { name: environment?.name },
      });

      return { success: true };
    }),
};

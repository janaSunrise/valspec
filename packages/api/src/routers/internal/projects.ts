import { ORPCError } from "@orpc/server";
import { z } from "zod";

import prisma from "@valspec/db";

import { protectedProcedure } from "../../procedures";
import { DEVELOPMENT_ENV_COLOR } from "../../constants";
import { createAuditLog } from "../../lib/audit";
import { requireProjectAccess, requireProjectWithEnvs } from "../../lib/ownership";
import { slugify } from "../../lib/utils";
import { createProjectSchema, updateProjectSchema } from "../../schemas/project";
import { projectIdSchema } from "../../schemas";

export const projectsRouter = {
  list: protectedProcedure.handler(async ({ context }) => {
    const projects = await prisma.project.findMany({
      where: { userId: context.session.user.id },
      include: {
        _count: { select: { environments: true } },
        environments: {
          select: { id: true, name: true, slug: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return projects;
  }),

  get: protectedProcedure.input(projectIdSchema).handler(async ({ context, input }) => {
    const { project, environments } = await requireProjectWithEnvs(
      input.projectId,
      context.session.user.id,
    );

    return { ...project, environments };
  }),

  create: protectedProcedure.input(createProjectSchema).handler(async ({ context, input }) => {
    const slug = slugify(input.name);
    if (!slug) {
      throw new ORPCError("BAD_REQUEST", { message: "Invalid project name" });
    }

    const existing = await prisma.project.findFirst({
      where: { userId: context.session.user.id, slug },
    });

    if (existing) {
      throw new ORPCError("CONFLICT", {
        message: "Project with this name already exists",
      });
    }

    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name: input.name,
          slug,
          description: input.description ?? null,
          userId: context.session.user.id,
        },
      });

      await tx.environment.create({
        data: {
          name: "Development",
          slug: "development",
          color: DEVELOPMENT_ENV_COLOR,
          projectId: newProject.id,
        },
      });

      return newProject;
    });

    await createAuditLog({
      action: "PROJECT_CREATED",
      projectId: project.id,
      actorType: "USER",
      actorUserId: context.session.user.id,
      metadata: { name: project.name },
    });

    return project;
  }),

  update: protectedProcedure
    .input(z.object({ ...projectIdSchema.shape, ...updateProjectSchema.shape }))
    .use(async ({ context, next }, input) => {
      await requireProjectAccess(input.projectId, context.session.user.id);
      return next({ context });
    })
    .handler(async ({ context, input }) => {
      const updates: { name?: string; slug?: string; description?: string | null } = {};

      if (input.name !== undefined) {
        const newSlug = slugify(input.name);
        if (!newSlug) {
          throw new ORPCError("BAD_REQUEST", { message: "Invalid project name" });
        }

        const existing = await prisma.project.findFirst({
          where: {
            userId: context.session.user.id,
            slug: newSlug,
            NOT: { id: input.projectId },
          },
        });

        if (existing) {
          throw new ORPCError("CONFLICT", {
            message: "Project with this name already exists",
          });
        }

        updates.name = input.name;
        updates.slug = newSlug;
      }

      if (input.description !== undefined) {
        updates.description = input.description ?? null;
      }

      if (Object.keys(updates).length === 0) {
        throw new ORPCError("BAD_REQUEST", { message: "No valid fields to update" });
      }

      const project = await prisma.project.update({
        where: { id: input.projectId },
        data: updates,
      });

      await createAuditLog({
        action: "PROJECT_UPDATED",
        projectId: project.id,
        actorType: "USER",
        actorUserId: context.session.user.id,
        metadata: { updates },
      });

      return project;
    }),

  delete: protectedProcedure
    .input(projectIdSchema)
    .use(async ({ context, next }, input) => {
      await requireProjectAccess(input.projectId, context.session.user.id);
      return next({ context });
    })
    .handler(async ({ context, input }) => {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        select: { name: true },
      });

      await prisma.project.delete({
        where: { id: input.projectId },
      });

      await createAuditLog({
        action: "PROJECT_DELETED",
        projectId: input.projectId,
        actorType: "USER",
        actorUserId: context.session.user.id,
        metadata: { name: project?.name },
      });

      return { success: true };
    }),
};

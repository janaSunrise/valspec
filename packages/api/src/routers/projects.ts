import { ORPCError } from "@orpc/server";
import { z } from "zod";

import prisma from "@valspec/db";

import { protectedProcedure } from "../index";
import { requireProjectAccess, requireProjectWithEnvs } from "../lib/ownership";
import { slugify } from "../lib/utils";
import { createProjectSchema, updateProjectSchema } from "../schemas/project";

const projectIdSchema = z.object({ projectId: z.cuid() });

export const projectsRouter = {
  list: protectedProcedure.handler(async ({ context }) => {
    const projects = await prisma.project.findMany({
      where: { userId: context.session.user.id },
      include: {
        _count: { select: { environments: true } },
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
          color: "#22c55e",
          projectId: newProject.id,
        },
      });

      return newProject;
    });

    return project;
  }),

  update: protectedProcedure
    .input(projectIdSchema.merge(updateProjectSchema))
    .handler(async ({ context, input }) => {
      await requireProjectAccess(input.projectId, context.session.user.id);

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

      return project;
    }),

  delete: protectedProcedure.input(projectIdSchema).handler(async ({ context, input }) => {
    await requireProjectAccess(input.projectId, context.session.user.id);

    await prisma.project.delete({
      where: { id: input.projectId },
    });

    return { success: true };
  }),
};

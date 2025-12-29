import prisma from "@valspec/db";

export async function getProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
  });
}

export async function getProjectWithEnvs(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    include: { environments: { orderBy: { createdAt: "asc" } } },
  });
}

export async function getEnvironment(projectId: string, envId: string, userId: string) {
  return prisma.environment.findFirst({
    where: { id: envId, projectId, project: { userId } },
  });
}

export async function getSecret(
  projectId: string,
  envId: string,
  secretId: string,
  userId: string,
) {
  return prisma.secret.findFirst({
    where: {
      id: secretId,
      environmentId: envId,
      environment: { projectId, project: { userId } },
    },
  });
}

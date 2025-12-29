"use client";

import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Sparkles } from "lucide-react";

import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectCardSkeletonGrid } from "@/components/projects/project-card-skeleton";
import { projectQueries } from "@/queries";

export default function DashboardPage() {
  const { data: projects, isLoading } = useQuery(projectQueries.list());

  const hasProjects = projects && projects.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your projects and their secrets</p>
        </div>
        <CreateProjectDialog />
      </div>

      {isLoading ? (
        <ProjectCardSkeletonGrid count={6} />
      ) : hasProjects ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-primary/20 bg-linear-to-b from-primary-soft/40 via-primary-soft/20 to-transparent px-8 py-20">
          <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/5 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 size-24 rounded-full bg-primary/5 blur-2xl" />

          <div className="relative flex flex-col items-center">
            <div className="relative">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-sm">
                <FolderOpen className="size-7" />
              </div>
              <div className="absolute -right-1.5 -top-1.5 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="size-3.5" />
              </div>
            </div>

            <h3 className="mt-6 text-lg font-semibold">Create your first project</h3>
            <p className="mt-2 max-w-sm text-center text-muted-foreground">
              Get started by creating a project to organize and secure your environment variables.
            </p>

            <div className="mt-8">
              <CreateProjectDialog />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { FolderOpen } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectCard } from "@/components/projects/project-card";
import { projectQueries } from "@/queries";

export default function DashboardPage() {
  const { data: projects, isLoading } = useQuery(projectQueries.list());

  return (
    <>
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-muted-foreground">Manage your projects and their secrets</p>
        </div>
        <CreateProjectDialog />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-8 py-20">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted ring-1 ring-border">
            <FolderOpen className="size-6 text-muted-foreground" />
          </div>
          <p className="mt-5 text-lg font-medium">No projects yet</p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Create your first project to start managing secrets
          </p>
          <div className="mt-8">
            <CreateProjectDialog />
          </div>
        </div>
      )}
    </>
  );
}

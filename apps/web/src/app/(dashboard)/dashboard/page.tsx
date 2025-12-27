"use client";

import { useQuery } from "@tanstack/react-query";
import { FolderOpen } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectCard } from "@/components/projects/project-card";
import { client } from "@/utils/orpc";

export default function DashboardPage() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", "list"],
    queryFn: () => client.projects.list(),
  });

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted ring-1 ring-border">
            <FolderOpen className="size-5 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm font-medium">No projects yet</p>
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            Create your first project to start managing secrets
          </p>
          <div className="mt-6">
            <CreateProjectDialog />
          </div>
        </div>
      )}
    </>
  );
}

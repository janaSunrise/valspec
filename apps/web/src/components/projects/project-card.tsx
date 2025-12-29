"use client";

import { Link } from "next-view-transitions";
import { ChevronRight, Layers } from "lucide-react";

import { cn } from "@/lib/utils";
import { ProjectActions } from "./project-actions";

import type { Route } from "next";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    _count: {
      environments: number;
    };
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const envCount = project._count.environments;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl",
        "bg-card border border-border/60",
        "p-6",
        "shadow-sm",
        "transition-all duration-200 ease-out",
        "hover:shadow-md hover:border-border",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <Link href={`/projects/${project.id}` as Route} className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold tracking-tight transition-colors duration-200 group-hover:text-primary">
            {project.name}
          </h3>
          <p className="mt-2 truncate font-mono text-sm text-muted-foreground">{project.slug}</p>
        </Link>

        <div className="flex items-center gap-2 transition-opacity duration-200">
          <ProjectActions project={project} />
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {project.description}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto pt-6">
        <div className="flex items-center justify-between">
          {/* Environment pill */}
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5">
            <Layers className="size-3.5 text-primary" />
            <span className="text-sm font-medium text-primary">
              {envCount} {envCount === 1 ? "env" : "envs"}
            </span>
          </div>

          {/* Arrow */}
          <Link href={`/projects/${project.id}` as Route}>
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-full",
                "bg-muted/50 text-muted-foreground",
                "transition-all duration-200",
                "group-hover:bg-primary group-hover:text-primary-foreground",
              )}
            >
              <ChevronRight className="size-4" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

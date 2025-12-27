"use client";

import { Link } from "next-view-transitions";
import { ChevronRight, Layers } from "lucide-react";

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
    <div className="group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:bg-muted/30">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/projects/${project.id}` as Route} className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold tracking-tight">{project.name}</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">{project.slug}</p>
        </Link>
        <div className="flex items-center gap-1">
          <ProjectActions project={project} />
          <Link href={`/projects/${project.id}` as Route}>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        </div>
      </div>

      {project.description && (
        <p className="mt-4 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
          {project.description}
        </p>
      )}

      <div className="mt-auto pt-5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Layers className="size-3" />
          <span>
            {envCount} environment{envCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

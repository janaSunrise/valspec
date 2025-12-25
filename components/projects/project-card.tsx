'use client';

import Link from 'next/link';
import { ChevronRight, Layers } from 'lucide-react';
import type { Tables } from '@/types/database.types';

type Project = Tables<'projects'> & {
  environments: { count: number }[];
};

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const envCount = project.environments?.[0]?.count ?? 0;

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-border hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold tracking-tight">{project.name}</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">{project.slug}</p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
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
            {envCount} environment{envCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </Link>
  );
}

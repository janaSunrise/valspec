import Link from 'next/link';
import { Folder } from 'lucide-react';
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
      className="group block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-muted">
            <Folder className="size-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">{project.name}</h3>
            <p className="text-xs text-muted-foreground">{project.slug}</p>
          </div>
        </div>
      </div>
      {project.description && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
      )}
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          {envCount} environment{envCount !== 1 ? 's' : ''}
        </span>
      </div>
    </Link>
  );
}

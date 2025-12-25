'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Tables } from '@/types/database.types';

type Environment = Tables<'environments'>;

interface EnvironmentTabsProps {
  projectSlug: string;
  environments: Environment[];
  activeEnvSlug?: string;
}

export function EnvironmentTabs({
  projectSlug,
  environments,
  activeEnvSlug,
}: EnvironmentTabsProps) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-border">
      {environments.map((env) => {
        const isActive =
          activeEnvSlug === env.slug || (!activeEnvSlug && pathname === `/projects/${projectSlug}`);

        return (
          <Link
            key={env.id}
            href={`/projects/${projectSlug}/${env.slug}`}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: env.color || '#6366f1' }}
            />
            {env.name}
          </Link>
        );
      })}
    </div>
  );
}

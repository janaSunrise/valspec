'use client';

import { GitBranch } from 'lucide-react';

interface InheritanceBadgeProps {
  sourceName: string;
}

export function InheritanceBadge({ sourceName }: InheritanceBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
      <GitBranch className="size-3" />
      {sourceName}
    </span>
  );
}

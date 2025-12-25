'use client';

import { GitBranch } from 'lucide-react';

interface InheritanceBadgeProps {
  sourceName: string;
}

export function InheritanceBadge({ sourceName }: InheritanceBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
      <GitBranch className="size-3" />
      <span>from {sourceName}</span>
    </span>
  );
}

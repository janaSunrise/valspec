'use client';

import { useState } from 'react';
import { Eye, EyeOff, MoreHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InheritanceBadge } from './inheritance-badge';
import type { ResolvedSecret } from '@/lib/secrets/inheritance';

interface SecretRowProps {
  secret: ResolvedSecret;
  projectId: string;
  envId: string;
  onEdit: (secret: ResolvedSecret) => void;
  onDelete: (secret: ResolvedSecret) => void;
}

export function SecretRow({ secret, projectId, onEdit, onDelete }: SecretRowProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [revealedValue, setRevealedValue] = useState<string | null>(null);

  const handleReveal = async () => {
    if (isRevealed) {
      setIsRevealed(false);
      setRevealedValue(null);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/environments/${secret.source_environment_id}/secrets/${secret.id}`
      );
      if (res.ok) {
        const data = await res.json();
        setRevealedValue(data.value);
        setIsRevealed(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    let valueToCopy = revealedValue;

    if (!valueToCopy) {
      const res = await fetch(
        `/api/projects/${projectId}/environments/${secret.source_environment_id}/secrets/${secret.id}`
      );
      if (res.ok) {
        const data = await res.json();
        valueToCopy = data.value;
      }
    }

    if (valueToCopy) {
      await navigator.clipboard.writeText(valueToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/30">
      {/* Left: Key name */}
      <div className="flex min-w-0 items-center gap-2">
        <code className="truncate rounded-md bg-muted px-2.5 py-1 font-mono text-xs font-semibold text-foreground">
          {secret.key}
        </code>
        {secret.inherited && secret.source_environment_name && (
          <InheritanceBadge sourceName={secret.source_environment_name} />
        )}
      </div>

      {/* Center: Value (clickable to copy) */}
      <div className="flex justify-center">
        <TooltipProvider delayDuration={0}>
          <Tooltip open={isCopied ? true : undefined}>
            <TooltipTrigger asChild>
              <button
                onClick={handleCopy}
                className="max-w-[280px] truncate rounded px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {isRevealed && revealedValue ? revealedValue : '••••••••••••••••••••'}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isCopied ? 'Copied!' : 'Click to copy'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0 text-foreground/50 hover:text-foreground"
          onClick={handleReveal}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isRevealed ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </Button>

        {!secret.inherited && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0 text-foreground/50 hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => onEdit(secret)}>Edit value</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(secret)}
                className="text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

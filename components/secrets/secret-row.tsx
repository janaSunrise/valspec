'use client';

import { useState } from 'react';
import { Eye, EyeOff, Copy, Check, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InheritanceBadge } from './inheritance-badge';
import type { ResolvedSecret } from '@/lib/secrets/inheritance';

interface SecretRowProps {
  secret: ResolvedSecret;
  projectId: string;
  envId: string;
  onEdit: (secret: ResolvedSecret) => void;
  onDelete: (secret: ResolvedSecret) => void;
}

export function SecretRow({ secret, projectId, envId, onEdit, onDelete }: SecretRowProps) {
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
    if (!revealedValue) {
      // Fetch value first if not revealed
      const res = await fetch(
        `/api/projects/${projectId}/environments/${secret.source_environment_id}/secrets/${secret.id}`
      );
      if (res.ok) {
        const data = await res.json();
        await navigator.clipboard.writeText(data.value);
      }
    } else {
      await navigator.clipboard.writeText(revealedValue);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <code className="shrink-0 text-sm font-medium">{secret.key}</code>
        {secret.inherited && secret.source_environment_name && (
          <InheritanceBadge sourceName={secret.source_environment_name} />
        )}
      </div>

      <div className="flex items-center gap-2">
        <code className="max-w-[200px] truncate text-sm text-muted-foreground">
          {isRevealed && revealedValue ? revealedValue : '•'.repeat(16)}
        </code>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
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

          <Button variant="ghost" size="icon" className="size-8" onClick={handleCopy}>
            {isCopied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
          </Button>

          {!secret.inherited && (
            <>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(secret)}>
                <Pencil className="size-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(secret)}
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

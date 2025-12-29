"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Copy, Check, MoreHorizontal, Loader2, GitBranch } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { secretQueries } from "@/queries";

export interface Secret {
  id: string;
  key: string;
  version: number;
  environmentId: string;
  inherited?: boolean;
  sourceEnvironmentId?: string;
  sourceEnvironmentName?: string;
}

interface SecretRowProps {
  secret: Secret;
  projectId: string;
  envId: string;
  onEdit: (secret: Secret) => void;
  onDelete: (secret: Secret) => void;
  onViewHistory: (secret: Secret) => void;
}

export function SecretRow({
  secret,
  projectId,
  envId,
  onEdit,
  onDelete,
  onViewHistory,
}: SecretRowProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const sourceEnvId = secret.sourceEnvironmentId ?? envId;

  const { data, isLoading } = useQuery({
    ...secretQueries.detail(projectId, sourceEnvId, secret.id),
    enabled: isRevealed,
    staleTime: 30000,
  });

  const handleCopy = async () => {
    try {
      let value = data?.value;
      if (!value) {
        const result = await api.internal
          .projects({ projectId })
          .environments({ envId: sourceEnvId })
          .secrets({ secretId: secret.id })
          .get();
        if (!result.error) value = result.data.value;
      }
      if (value) {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      // Silent fail
    }
  };

  return (
    <div className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/30">
      {/* Key badge */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <code className="inline-flex items-center rounded-lg bg-muted/60 px-2.5 py-1 font-mono text-[13px] font-medium">
            {secret.key}
          </code>

          {/* Inherited badge */}
          {secret.inherited && secret.sourceEnvironmentName && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <GitBranch className="size-3" />
              {secret.sourceEnvironmentName}
            </span>
          )}
        </div>
      </div>

      {/* Value preview */}
      <div className="w-28 shrink-0">
        {isLoading ? (
          <Loader2 className="mx-auto size-3.5 animate-spin text-muted-foreground" />
        ) : (
          <span
            className={cn(
              "inline-block rounded-md px-2 py-0.5 font-mono text-xs",
              isRevealed && data?.value
                ? "bg-accent-mint/15 text-accent-mint"
                : "text-muted-foreground",
            )}
          >
            {isRevealed && data?.value
              ? data.value.length > 12
                ? `${data.value.slice(0, 12)}...`
                : data.value
              : "••••••••"}
          </span>
        )}
      </div>

      {/* Version pill */}
      <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
        v{secret.version}
      </span>

      {/* Actions - always visible but subtle */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
          disabled={isLoading}
        >
          {copied ? <Check className="size-3.5 text-accent-mint" /> : <Copy className="size-3.5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
          onClick={() => setIsRevealed(!isRevealed)}
          disabled={isLoading}
        >
          {isRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </Button>

        {!secret.inherited && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => onEdit(secret)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewHistory(secret)}>History</DropdownMenuItem>
              <DropdownMenuSeparator />
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

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
import { client } from "@/utils/orpc";

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
    queryKey: ["secret-value", projectId, sourceEnvId, secret.id],
    queryFn: () => client.secrets.get({ projectId, envId: sourceEnvId, secretId: secret.id }),
    enabled: isRevealed,
    staleTime: 30000,
  });

  const handleCopy = async () => {
    try {
      let value = data?.value;
      if (!value) {
        const fetched = await client.secrets.get({
          projectId,
          envId: sourceEnvId,
          secretId: secret.id,
        });
        value = fetched.value;
      }
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silent fail
    }
  };

  return (
    <div className="group flex h-11 items-center gap-3 px-4 transition-colors hover:bg-muted/30">
      {/* Key */}
      <code className="min-w-0 flex-1 truncate text-[13px] font-medium">{secret.key}</code>

      {/* Inherited badge */}
      {secret.inherited && secret.sourceEnvironmentName && (
        <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
          <GitBranch className="size-3" />
          {secret.sourceEnvironmentName}
        </span>
      )}

      {/* Value preview */}
      <div className="w-28 text-center">
        {isLoading ? (
          <Loader2 className="mx-auto size-3 animate-spin text-muted-foreground" />
        ) : (
          <span
            className={cn(
              "font-mono text-xs",
              isRevealed && data?.value ? "text-foreground" : "text-muted-foreground",
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

      {/* Version */}
      <span className="w-6 text-center text-[11px] tabular-nums text-muted-foreground">
        v{secret.version}
      </span>

      {/* Actions - visible on hover */}
      <div className="flex w-20 items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-6"
          onClick={handleCopy}
          disabled={isLoading}
        >
          {copied ? (
            <Check className="size-3 text-emerald-500" />
          ) : (
            <Copy className="size-3 text-muted-foreground" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="size-6"
          onClick={() => setIsRevealed(!isRevealed)}
          disabled={isLoading}
        >
          {isRevealed ? (
            <EyeOff className="size-3 text-muted-foreground" />
          ) : (
            <Eye className="size-3 text-muted-foreground" />
          )}
        </Button>

        {!secret.inherited && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="size-6">
                <MoreHorizontal className="size-3 text-muted-foreground" />
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

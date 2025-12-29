"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  FolderPlus,
  FolderPen,
  FolderX,
  Layers,
  Settings,
  Trash2,
  Key,
  KeyRound,
  LockKeyhole,
  LockKeyholeOpen,
  Eye,
  User,
  Bot,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { auditQueries } from "@/queries";

type AuditAction =
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "PROJECT_DELETED"
  | "ENVIRONMENT_CREATED"
  | "ENVIRONMENT_UPDATED"
  | "ENVIRONMENT_DELETED"
  | "SECRET_CREATED"
  | "SECRET_UPDATED"
  | "SECRET_DELETED"
  | "SECRET_VIEWED"
  | "API_KEY_CREATED"
  | "API_KEY_REVOKED";

type ActorType = "USER" | "API_KEY";

interface AuditLog {
  id: string;
  action: AuditAction;
  actorType: ActorType;
  actorUserId: string | null;
  actorId: string | null;
  environmentId: string | null;
  environmentName: string | null;
  secretId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

const ACTION_CONFIG: Record<AuditAction, { label: string; icon: React.ElementType; color: string }> = {
  PROJECT_CREATED: { label: "Project created", icon: FolderPlus, color: "text-emerald-500" },
  PROJECT_UPDATED: { label: "Project updated", icon: FolderPen, color: "text-blue-500" },
  PROJECT_DELETED: { label: "Project deleted", icon: FolderX, color: "text-red-500" },
  ENVIRONMENT_CREATED: { label: "Environment created", icon: Layers, color: "text-emerald-500" },
  ENVIRONMENT_UPDATED: { label: "Environment updated", icon: Settings, color: "text-blue-500" },
  ENVIRONMENT_DELETED: { label: "Environment deleted", icon: Trash2, color: "text-red-500" },
  SECRET_CREATED: { label: "Secret created", icon: LockKeyhole, color: "text-emerald-500" },
  SECRET_UPDATED: { label: "Secret updated", icon: LockKeyholeOpen, color: "text-blue-500" },
  SECRET_DELETED: { label: "Secret deleted", icon: Trash2, color: "text-red-500" },
  SECRET_VIEWED: { label: "Secret viewed", icon: Eye, color: "text-amber-500" },
  API_KEY_CREATED: { label: "API key created", icon: Key, color: "text-emerald-500" },
  API_KEY_REVOKED: { label: "API key revoked", icon: KeyRound, color: "text-red-500" },
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getMetadataDescription(action: AuditAction, metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;

  switch (action) {
    case "PROJECT_CREATED":
    case "PROJECT_DELETED":
    case "ENVIRONMENT_CREATED":
    case "ENVIRONMENT_DELETED":
      return metadata.name as string | null;
    case "SECRET_CREATED":
    case "SECRET_DELETED":
    case "SECRET_VIEWED":
      return metadata.key as string | null;
    case "SECRET_UPDATED":
      return metadata.key ? `${metadata.key} (v${metadata.version})` : null;
    case "API_KEY_CREATED":
    case "API_KEY_REVOKED":
      return metadata.name as string | null;
    default:
      return null;
  }
}

interface AuditLogListProps {
  projectId: string;
  environmentId?: string;
  action?: string;
}

export function AuditLogList({ projectId, environmentId, action }: AuditLogListProps) {
  const { data: logs = [], isLoading } = useQuery(auditQueries.list(projectId, { environmentId, action }));

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Eye className="size-5 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm font-medium">No activity yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Actions in this project will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {logs.map((log: AuditLog) => {
        const config = ACTION_CONFIG[log.action];
        const Icon = config.icon;
        const description = getMetadataDescription(log.action, log.metadata);

        return (
          <div key={log.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50">
            <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted", config.color)}>
              <Icon className="size-3.5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{config.label}</span>
                {description && (
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{description}</code>
                )}
              </div>

              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  {log.actorType === "USER" ? <User className="size-3" /> : <Bot className="size-3" />}
                  {log.actorType === "USER" ? "User" : "API Key"}
                </span>
                {log.environmentName && (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                      {log.environmentName}
                    </Badge>
                  </>
                )}
                <span className="text-muted-foreground/50">·</span>
                <span>{formatRelativeTime(log.createdAt)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

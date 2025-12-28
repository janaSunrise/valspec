"use client";

import { use, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Link } from "next-view-transitions";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuditLogList } from "@/components/audit/audit-log-list";
import { client } from "@/utils/orpc";

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

const ACTION_OPTIONS: { value: AuditAction; label: string }[] = [
  { value: "PROJECT_CREATED", label: "Project created" },
  { value: "PROJECT_UPDATED", label: "Project updated" },
  { value: "PROJECT_DELETED", label: "Project deleted" },
  { value: "ENVIRONMENT_CREATED", label: "Environment created" },
  { value: "ENVIRONMENT_UPDATED", label: "Environment updated" },
  { value: "ENVIRONMENT_DELETED", label: "Environment deleted" },
  { value: "SECRET_CREATED", label: "Secret created" },
  { value: "SECRET_UPDATED", label: "Secret updated" },
  { value: "SECRET_DELETED", label: "Secret deleted" },
  { value: "SECRET_VIEWED", label: "Secret viewed" },
  { value: "API_KEY_CREATED", label: "API key created" },
  { value: "API_KEY_REVOKED", label: "API key revoked" },
];

interface AuditPageProps {
  params: Promise<{ projectId: string }>;
}

export default function AuditPage({ params }: AuditPageProps) {
  const { projectId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const envId = searchParams.get("env") ?? undefined;
  const actionParam = searchParams.get("action");
  const actionFilter = actionParam ? (actionParam as AuditAction) : undefined;

  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => client.projects.get({ projectId }),
  });

  const environments = useMemo(() => project?.environments ?? [], [project?.environments]);

  const updateFilters = (updates: { env?: string | null; action?: string | null }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.env !== undefined) {
      if (updates.env) {
        params.set("env", updates.env);
      } else {
        params.delete("env");
      }
    }

    if (updates.action !== undefined) {
      if (updates.action) {
        params.set("action", updates.action);
      } else {
        params.delete("action");
      }
    }

    const queryString = params.toString();
    router.push(`/projects/${projectId}/audit${queryString ? `?${queryString}` : ""}`);
  };

  if (projectLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Project not found</p>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ChevronLeft className="mr-1.5 size-4" />
            Back to dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/projects/${projectId}`}>
          <Button variant="ghost" size="icon-sm">
            <ChevronLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Activity Log</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{project.name}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          value={envId ?? "all"}
          onValueChange={(value) => updateFilters({ env: value === "all" ? null : value })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All environments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All environments</SelectItem>
            {environments.map((env) => (
              <SelectItem key={env.id} value={env.id}>
                {env.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={actionFilter ?? "all"}
          onValueChange={(value) => updateFilters({ action: value === "all" ? null : value })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {ACTION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(envId || actionFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateFilters({ env: null, action: null })}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Audit Logs */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <AuditLogList projectId={projectId} environmentId={envId} action={actionFilter} />
      </div>
    </div>
  );
}

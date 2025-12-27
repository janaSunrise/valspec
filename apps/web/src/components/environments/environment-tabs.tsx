"use client";

import { Link } from "next-view-transitions";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CreateEnvironmentDialog } from "./create-environment-dialog";

import type { Route } from "next";

interface Environment {
  id: string;
  name: string;
  slug: string;
  color: string;
  inheritsFromId: string | null;
}

interface EnvironmentTabsProps {
  projectId: string;
  environments: Environment[];
  activeEnvId?: string;
}

export function EnvironmentTabs({ projectId, environments, activeEnvId }: EnvironmentTabsProps) {
  return (
    <div className="inline-flex items-center gap-1.5">
      {environments.map((env) => {
        const isActive = activeEnvId === env.id;

        return (
          <Link
            key={env.id}
            href={`/projects/${projectId}?env=${env.id}` as Route}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-all duration-150",
              isActive
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-foreground/60 hover:bg-background/60 hover:text-foreground",
            )}
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: env.color || "#6366f1" }}
            />
            <span className="font-medium">{env.name}</span>
          </Link>
        );
      })}

      <CreateEnvironmentDialog
        projectId={projectId}
        environments={environments}
        trigger={
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="ml-1 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-all duration-150 hover:bg-background/60 hover:text-foreground">
                <Plus className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Add environment</p>
            </TooltipContent>
          </Tooltip>
        }
      />
    </div>
  );
}

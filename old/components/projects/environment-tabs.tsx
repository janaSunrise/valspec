"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateEnvironmentDialog } from "./create-environment-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Tables } from "@/types/database.types";

type Environment = Tables<"environments">;

interface EnvironmentTabsProps {
  projectId: string;
  projectSlug: string;
  environments: Environment[];
  activeEnvSlug?: string;
}

export function EnvironmentTabs({
  projectId,
  projectSlug,
  environments,
  activeEnvSlug,
}: EnvironmentTabsProps) {
  return (
    <div className="inline-flex items-center gap-1.5">
      {environments.map((env) => {
        const isActive = activeEnvSlug === env.slug;

        return (
          <Link
            key={env.id}
            href={`/projects/${projectSlug}/${env.slug}`}
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

      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <CreateEnvironmentDialog
                projectId={projectId}
                projectSlug={projectSlug}
                environments={environments}
                trigger={
                  <button className="ml-1 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-all duration-150 hover:bg-background/60 hover:text-foreground">
                    <Plus className="size-4" />
                  </button>
                }
              />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Add environment</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

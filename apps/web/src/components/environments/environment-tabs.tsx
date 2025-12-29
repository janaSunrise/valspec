"use client";

import { useState } from "react";
import { Link } from "next-view-transitions";
import { useTransitionRouter } from "next-view-transitions";
import { Plus, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { ColorPicker } from "./color-picker";
import { useCreateEnvironment } from "@/mutations";

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
  const router = useTransitionRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [inheritsFromId, setInheritsFromId] = useState<string>("none");

  const createEnvironment = useCreateEnvironment(projectId);

  const resetForm = () => {
    setName("");
    setColor("#3b82f6");
    setInheritsFromId("none");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEnvironment.mutate(
      {
        name: name.trim(),
        color,
        inheritsFromId: inheritsFromId === "none" ? undefined : inheritsFromId,
      },
      {
        onSuccess: (env) => {
          setOpen(false);
          resetForm();
          router.push(`/projects/${projectId}?env=${env.id}`);
        },
      },
    );
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetForm();
  };

  const selectedEnv = environments.find((e) => e.id === inheritsFromId);

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
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
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

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <button className="ml-1 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-all duration-150 hover:bg-background/60 hover:text-foreground">
                <Plus className="size-4" />
              </button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Add environment</p>
          </TooltipContent>
        </Tooltip>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create environment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="env-name">Name</FieldLabel>
              <Input
                id="env-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="staging"
                required
                disabled={createEnvironment.isPending}
              />
            </Field>

            <Field>
              <FieldLabel>Color</FieldLabel>
              <ColorPicker
                value={color}
                onChange={setColor}
                disabled={createEnvironment.isPending}
              />
            </Field>

            <Field>
              <FieldLabel>Inherits from</FieldLabel>
              <Select
                value={inheritsFromId}
                onValueChange={setInheritsFromId}
                disabled={createEnvironment.isPending}
              >
                <SelectTrigger>
                  <SelectValue>
                    {inheritsFromId === "none" ? (
                      "None"
                    ) : selectedEnv ? (
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: selectedEnv.color || "#6366f1" }}
                        />
                        {selectedEnv.name}
                      </span>
                    ) : (
                      "Select environment"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {environments.map((env) => (
                    <SelectItem key={env.id} value={env.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: env.color || "#6366f1" }}
                        />
                        {env.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Inherited secrets will be available in this environment
              </FieldDescription>
            </Field>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createEnvironment.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createEnvironment.isPending || !name.trim()}>
                {createEnvironment.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

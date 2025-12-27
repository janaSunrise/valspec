"use client";

import { useState } from "react";
import { useTransitionRouter } from "next-view-transitions";
import { useMutation } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { ColorPicker } from "./color-picker";
import { client, queryClient } from "@/utils/orpc";

interface Environment {
  id: string;
  name: string;
  slug: string;
  color: string;
  inheritsFromId: string | null;
}

interface CreateEnvironmentDialogProps {
  projectId: string;
  environments: Environment[];
  trigger?: React.ReactElement;
}

export function CreateEnvironmentDialog({
  projectId,
  environments,
  trigger,
}: CreateEnvironmentDialogProps) {
  const router = useTransitionRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [inheritsFromId, setInheritsFromId] = useState<string>("none");

  const createEnvironment = useMutation({
    mutationFn: (data: { name: string; color: string; inheritsFromId: string | null }) =>
      client.environments.create({ projectId, ...data }),
    onSuccess: (env) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setOpen(false);
      resetForm();
      toast.success("Environment created");
      router.push(`/projects/${projectId}?env=${env.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create environment");
    },
  });

  const resetForm = () => {
    setName("");
    setColor("#3b82f6");
    setInheritsFromId("none");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEnvironment.mutate({
      name: name.trim(),
      color,
      inheritsFromId: inheritsFromId === "none" ? null : inheritsFromId,
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetForm();
  };

  const handleInheritsChange = (value: string | null) => {
    if (value !== null) {
      setInheritsFromId(value);
    }
  };

  const selectedEnv = environments.find((e) => e.id === inheritsFromId);

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Plus className="mr-1.5 size-4" />
      Add environment
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger ?? defaultTrigger} />
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
              onValueChange={handleInheritsChange}
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
              {createEnvironment.isPending ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

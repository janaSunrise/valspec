"use client";

import { useState } from "react";
import { useTransitionRouter } from "next-view-transitions";
import { useMutation } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { ColorPicker } from "./color-picker";
import { client, queryClient } from "@/utils/orpc";

interface Environment {
  id: string;
  name: string;
  slug: string;
  color: string;
  inheritsFromId: string | null;
}

interface EnvironmentActionsProps {
  projectId: string;
  environment: Environment;
  environments: Environment[];
}

export function EnvironmentActions({
  projectId,
  environment,
  environments,
}: EnvironmentActionsProps) {
  const router = useTransitionRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(environment.name);
  const [color, setColor] = useState(environment.color || "#6366f1");
  const [inheritsFromId, setInheritsFromId] = useState<string>(
    environment.inheritsFromId || "none",
  );

  const selectedEnv = environments.find((e) => e.id === inheritsFromId);

  const updateEnvironment = useMutation({
    mutationFn: (data: { name?: string; color?: string; inheritsFromId?: string | null }) =>
      client.environments.update({ projectId, envId: environment.id, ...data }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setEditOpen(false);
      toast.success("Environment updated");
      router.push(`/projects/${projectId}?env=${updated.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update environment");
    },
  });

  const deleteEnvironment = useMutation({
    mutationFn: () => client.environments.delete({ projectId, envId: environment.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setDeleteOpen(false);
      toast.success("Environment deleted");
      // Redirect to project page without env param - will auto-select first env
      router.push(`/projects/${projectId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete environment");
      setDeleteOpen(false);
    },
  });

  // Filter out current environment and any that inherit from it (to prevent cycles)
  const availableParents = environments.filter((env) => {
    if (env.id === environment.id) return false;
    if (env.inheritsFromId === environment.id) return false;
    return true;
  });

  const resetForm = () => {
    setName(environment.name);
    setColor(environment.color || "#6366f1");
    setInheritsFromId(environment.inheritsFromId || "none");
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateEnvironment.mutate({
      name: name.trim(),
      color,
      inheritsFromId: inheritsFromId === "none" ? null : inheritsFromId,
    });
  };

  const handleDelete = () => {
    deleteEnvironment.mutate();
  };

  const handleEditOpenChange = (isOpen: boolean) => {
    setEditOpen(isOpen);
    if (!isOpen) resetForm();
  };

  const isOnlyEnvironment = environments.length <= 1;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon-sm" className="size-8">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 size-4" />
            Edit environment
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            disabled={isOnlyEnvironment}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            Delete environment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit environment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="edit-env-name">Name</FieldLabel>
              <Input
                id="edit-env-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={updateEnvironment.isPending}
              />
            </Field>

            <Field>
              <FieldLabel>Color</FieldLabel>
              <ColorPicker
                value={color}
                onChange={setColor}
                disabled={updateEnvironment.isPending}
              />
            </Field>

            <Field>
              <FieldLabel>Inherits from</FieldLabel>
              <Select
                value={inheritsFromId}
                onValueChange={setInheritsFromId}
                disabled={updateEnvironment.isPending}
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
                  {availableParents.map((env) => (
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
            </Field>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={updateEnvironment.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateEnvironment.isPending || !name.trim()}>
                {updateEnvironment.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete environment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{environment.name}</strong> and all its secrets.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEnvironment.isPending}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleDelete}
              disabled={deleteEnvironment.isPending}
              variant="destructive"
            >
              {deleteEnvironment.isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

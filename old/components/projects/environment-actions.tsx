"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ColorPicker } from "./color-picker";
import { ErrorAlert } from "@/components/ui/error-alert";
import { MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { useUpdateEnvironment, useDeleteEnvironment } from "@/lib/hooks/use-environments";
import type { Tables } from "@/types/database.types";

type Environment = Tables<"environments">;

interface EnvironmentActionsProps {
  projectId: string;
  projectSlug: string;
  environment: Environment;
  environments: Environment[];
}

export function EnvironmentActions({
  projectId,
  projectSlug,
  environment,
  environments,
}: EnvironmentActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(environment.name);
  const [color, setColor] = useState(environment.color || "#6366f1");
  const [inheritsFromId, setInheritsFromId] = useState<string>(
    environment.inherits_from_id || "none",
  );
  const [error, setError] = useState("");

  const updateEnvironment = useUpdateEnvironment(projectId, environment.id);
  const deleteEnvironment = useDeleteEnvironment(projectId);

  // Filter out current environment and any that inherit from it (to prevent cycles)
  const availableParents = environments.filter((env) => {
    if (env.id === environment.id) return false;
    // Check if this env inherits from current (direct cycle)
    if (env.inherits_from_id === environment.id) return false;
    return true;
  });

  const resetForm = () => {
    setName(environment.name);
    setColor(environment.color || "#6366f1");
    setInheritsFromId(environment.inherits_from_id || "none");
    setError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const updated = await updateEnvironment.mutateAsync({
        name,
        color,
        inherits_from_id: inheritsFromId === "none" ? null : inheritsFromId,
      });
      setEditOpen(false);
      router.push(`/projects/${projectSlug}/${updated.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update environment");
    }
  };

  const handleDelete = async () => {
    setError("");

    try {
      await deleteEnvironment.mutateAsync(environment.id);
      // Redirect to project page (will redirect to first remaining env)
      router.push(`/projects/${projectSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete environment");
      setDeleteOpen(false);
    }
  };

  const isOnlyEnvironment = environments.length <= 1;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="size-8 p-0">
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

      <Dialog
        open={editOpen}
        onOpenChange={(isOpen) => {
          setEditOpen(isOpen);
          if (!isOpen) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit environment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <ErrorAlert message={error} />

            <div className="space-y-1.5">
              <label
                htmlFor="edit-env-name"
                className="text-xs uppercase tracking-widest text-muted-foreground"
              >
                Name
              </label>
              <Input
                id="edit-env-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={updateEnvironment.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Color
              </label>
              <ColorPicker
                value={color}
                onChange={setColor}
                disabled={updateEnvironment.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Inherits from
              </label>
              <Select
                value={inheritsFromId}
                onValueChange={setInheritsFromId}
                disabled={updateEnvironment.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select environment" />
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
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditOpen(false)}
                disabled={updateEnvironment.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateEnvironment.isPending || !name.trim()}>
                {updateEnvironment.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
              </Button>
            </div>
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
          <ErrorAlert message={error} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEnvironment.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteEnvironment.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEnvironment.isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

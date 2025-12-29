import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, getErrorMessage } from "@/lib/api";
import { projectQueries } from "@/queries";

type CreateProjectInput = { name: string; description?: string };
type UpdateProjectInput = { name?: string; description?: string | null };

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data, error } = await api.internal.projects.post(input);
      if (error) throw new Error(getErrorMessage(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectQueries.all() });
      toast.success("Project created");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProjectInput) => {
      const { data, error } = await api.internal.projects({ projectId }).patch(input);
      if (error) throw new Error(getErrorMessage(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectQueries.all() });
      toast.success("Project updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data, error } = await api.internal.projects({ projectId }).delete();
      if (error) throw new Error(getErrorMessage(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectQueries.all() });
      toast.success("Project deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

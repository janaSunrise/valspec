import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, getErrorMessage } from "@/lib/api";
import { environmentQueries, projectQueries } from "@/queries";

type CreateEnvironmentInput = { name: string; color?: string; inheritsFromId?: string };
type UpdateEnvironmentInput = { name?: string; color?: string; inheritsFromId?: string | null };

export function useCreateEnvironment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEnvironmentInput) => {
      const { data, error } = await api.internal.projects({ projectId }).environments.post(input);
      if (error) throw new Error(getErrorMessage(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: environmentQueries.all(projectId) });
      queryClient.invalidateQueries({ queryKey: projectQueries.all() });
      toast.success("Environment created");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateEnvironment(projectId: string, envId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateEnvironmentInput) => {
      const { data, error } = await api.internal
        .projects({ projectId })
        .environments({ envId })
        .patch(input);
      if (error) throw new Error(getErrorMessage(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: environmentQueries.all(projectId) });
      queryClient.invalidateQueries({ queryKey: projectQueries.all() });
      toast.success("Environment updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteEnvironment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (envId: string) => {
      const { data, error } = await api.internal.projects({ projectId }).environments({ envId }).delete();
      if (error) throw new Error(getErrorMessage(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: environmentQueries.all(projectId) });
      queryClient.invalidateQueries({ queryKey: projectQueries.all() });
      toast.success("Environment deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

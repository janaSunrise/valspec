import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, getErrorMessage } from "@/lib/api";
import { secretQueries, versionQueries } from "@/queries";

type CreateSecretInput = { key: string; value: string };
type UpdateSecretInput = { value: string };
type ImportSecretsInput = { content: string; overwrite?: boolean };

export function useCreateSecret(projectId: string, envId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSecretInput) => {
      const { data, error } = await api.internal
        .projects({ projectId })
        .environments({ envId })
        .secrets.post(input);
      if (error) throw new Error(getErrorMessage(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: secretQueries.all(projectId, envId) });
      toast.success("Secret created");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateSecret(projectId: string, envId: string, secretId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSecretInput) => {
      const { data, error } = await api.internal
        .projects({ projectId })
        .environments({ envId })
        .secrets({ secretId })
        .patch(input);
      if (error) throw new Error(getErrorMessage(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: secretQueries.all(projectId, envId) });
      queryClient.invalidateQueries({ queryKey: versionQueries.all(projectId, envId, secretId) });
      toast.success("Secret updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteSecret(projectId: string, envId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (secretId: string) => {
      const { data, error } = await api.internal
        .projects({ projectId })
        .environments({ envId })
        .secrets({ secretId })
        .delete();
      if (error) throw new Error(getErrorMessage(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: secretQueries.all(projectId, envId) });
      toast.success("Secret deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useImportSecrets(projectId: string, envId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ImportSecretsInput) => {
      const { data, error } = await api.internal
        .projects({ projectId })
        .environments({ envId })
        .secrets.import.post(input);
      if (error) throw new Error(getErrorMessage(error));
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: secretQueries.all(projectId, envId) });
      const created = data.created.length;
      const updated = data.updated.length;
      const skipped = data.skipped.length;
      toast.success(`Import complete: ${created} created, ${updated} updated, ${skipped} skipped`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useRollbackSecret(projectId: string, envId: string, secretId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data, error } = await api.internal
        .projects({ projectId })
        .environments({ envId })
        .secrets({ secretId })
        .versions({ versionId })
        .rollback.post({});
      if (error) throw new Error(getErrorMessage(error));
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: secretQueries.all(projectId, envId) });
      queryClient.invalidateQueries({ queryKey: versionQueries.all(projectId, envId, secretId) });
      toast.success(`Rolled back to version ${data.rolledBackToVersion}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

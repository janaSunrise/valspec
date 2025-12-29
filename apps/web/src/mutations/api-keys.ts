import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, getErrorMessage } from "@/lib/api";
import { apiKeyQueries } from "@/queries";

type CreateApiKeyInput = {
  name: string;
  projectId: string;
  environmentId?: string;
  permissions?: string[];
  expiresIn?: number;
};

type UpdateApiKeyInput = {
  name?: string;
  enabled?: boolean;
};

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateApiKeyInput) => {
      const { data, error } = await api.internal["api-keys"].post(input);
      if (error) throw new Error(getErrorMessage(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyQueries.all() });
      toast.success("API key created");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateApiKey(keyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateApiKeyInput) => {
      const { data, error } = await api.internal["api-keys"]({ keyId }).patch(input);
      if (error) throw new Error(getErrorMessage(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyQueries.all() });
      toast.success("API key updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      const { data, error } = await api.internal["api-keys"]({ keyId }).delete();
      if (error) throw new Error(getErrorMessage(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyQueries.all() });
      toast.success("API key deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
